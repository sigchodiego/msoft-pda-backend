import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { fail } from "../utils/apiResponse.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return fail(res, "Validación fallida", 400, err.issues);
  }

  console.error(err);
  const detail = err instanceof Error ? err.message : "Error no identificado";
  return fail(res, "Error interno del servidor", 500, null, { detail });
}
