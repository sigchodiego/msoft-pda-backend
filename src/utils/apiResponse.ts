import type { Response } from "express";
import { notifySlack } from "../notifications/slack.js";

type FailOptions = {
  detail?: string;
};

function reportConsumption(
  res: Response,
  message: string,
  status: number,
  detail?: string
): void {
  const req = res.req;
  if (req?.method === "OPTIONS") return;

  const route =
    req?.method && req.originalUrl ? `${req.method} ${req.originalUrl}` : "solicitud";
  const fields: Record<string, string> = {
    estado: String(status),
    ruta: route,
  };
  if (detail) fields.detalle = detail.slice(0, 700);

  notifySlack({
    title: "Consumo de endpoint",
    level: status >= 500 ? "error" : status >= 400 ? "warn" : "info",
    message: `${route} · ${message}`,
    fields,
  });
}

export function ok(res: Response, data: unknown, message = "OK", status = 200) {
  reportConsumption(res, message, status);
  return res.status(status).json({
    success: true,
    message,
    data,
  });
}

function summarizeErrors(errors: unknown): string | undefined {
  if (!Array.isArray(errors) || errors.length === 0) return undefined;

  const lines: string[] = [];
  for (const issue of errors.slice(0, 8)) {
    if (!issue || typeof issue !== "object") continue;
    const record = issue as { path?: unknown; message?: unknown };
    const path = Array.isArray(record.path)
      ? record.path.map((part) => String(part)).join(".")
      : "";
    const message = typeof record.message === "string" ? record.message : "";
    if (!path && !message) continue;
    lines.push(path && message ? `${path}: ${message}` : path || message);
  }

  if (lines.length === 0) return undefined;
  const extra =
    errors.length > lines.length ? ` (+${errors.length - lines.length} más)` : "";
  return `${lines.join("; ")}${extra}`;
}

export function fail(
  res: Response,
  message: string,
  status = 400,
  errors: unknown = null,
  options?: FailOptions
) {
  const parts = [options?.detail, summarizeErrors(errors)].filter(
    (part): part is string => Boolean(part)
  );
  if (parts.length > 0) reportConsumption(res, message, status, parts.join(" | "));
  else reportConsumption(res, message, status);

  return res.status(status).json({
    success: false,
    message,
    errors,
  });
}
