import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { MongooseAuthRepository } from "../repositories/MongooseAuthRepository.js";
import { fail, ok } from "../utils/apiResponse.js";

const SECRET_KEY =
  process.env.JWT_SECRET || "MIS_LLAVE_SECRETA_DE_MAESTRIA_2026";

export function createAuthController(repo: MongooseAuthRepository) {
  return {
    register: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email, password } = req.body;
        const existing = await repo.findByEmail(email);
        if (existing) {
          return fail(res, "El correo ya está registrado", 409);
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await repo.createUser({ email, password: hashed });
        return ok(
          res,
          { email: user.email, rol: user.rol },
          "Usuario registrado",
          201
        );
      } catch (err) {
        return next(err);
      }
    },

    login: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { email, password } = req.body;
        const user = await repo.findByEmail(email);
        if (!user) {
          return fail(
            res,
            "Credenciales inválidas: El usuario no se encuentra registrado",
            401
          );
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return fail(res, "Credenciales inválidas: Contraseña incorrecta", 401);
        }

        const token = jwt.sign(
          { id: String(user._id), rol: user.rol },
          SECRET_KEY,
          { expiresIn: "2h" }
        );

        return ok(res, {
          token,
          user: { email: user.email, rol: user.rol },
        });
      } catch (err) {
        return next(err);
      }
    },
  };
}
