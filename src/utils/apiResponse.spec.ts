import { afterEach, describe, expect, it, jest } from "@jest/globals";
import type { Request, Response } from "express";
import { ok } from "./apiResponse.js";

describe("consumo de endpoints", () => {
  const previousWebhook = process.env.SLACK_WEBHOOK_URL;
  const previousFetch = globalThis.fetch;

  afterEach(() => {
    if (previousWebhook === undefined) delete process.env.SLACK_WEBHOOK_URL;
    else process.env.SLACK_WEBHOOK_URL = previousWebhook;
    globalThis.fetch = previousFetch;
  });

  it("avisa un PUT exitoso sin incluir el cuerpo", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T/B/test";
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      new Response("ok", { status: 200 })
    );
    globalThis.fetch = fetchMock;

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = {
      req: { method: "PUT", originalUrl: "/api/empleados/abc" } as Request,
      status,
    } as unknown as Response;

    ok(res, { nombre: "Ana", sueldo: 1000 }, "Empleado actualizado");
    await Promise.resolve();

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      success: true,
      message: "Empleado actualizado",
      data: { nombre: "Ana", sueldo: 1000 },
    });

    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();
    const init = call?.[1];
    const rawBody = init && typeof init.body === "string" ? init.body : "";
    expect(rawBody).toContain("Consumo de endpoint");
    expect(rawBody).toContain("PUT /api/empleados/abc");
    expect(rawBody).toContain("Empleado actualizado");
    expect(rawBody).not.toContain("sueldo");
    expect(rawBody).not.toContain("Ana");
  });
});
