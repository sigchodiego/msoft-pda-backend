import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { fail } from "../utils/apiResponse.js";

const SECRET_KEY =
  process.env.JWT_SECRET || "MIS_LLAVE_SECRETA_DE_MAESTRIA_2026";

export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    fail(
      res,
      "Acceso denegado: No se proporcionó un token de autenticación válido",
      401
    );
    return;
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    fail(
      res,
      "Acceso denegado: No se proporcionó un token de autenticación válido",
      401
    );
    return;
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY) as unknown as {
      id: string;
      rol: string;
    };
    (req as Request & { user?: { id: string; rol: string } }).user = decoded;
    next();
  } catch {
    fail(res, "El token proporcionado ha expirado o su firma es inválida", 403);
  }
}
