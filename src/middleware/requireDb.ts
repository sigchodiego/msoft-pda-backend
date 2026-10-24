import type { NextFunction, Request, Response } from "express";
import { isDatabaseReady } from "../config/database.js";
import { fail } from "../utils/apiResponse.js";

export function requireDb(req: Request, res: Response, next: NextFunction) {
  if (!isDatabaseReady()) {
    return fail(res, "Base de datos no disponible temporalmente", 503);
  }
  return next();
}
