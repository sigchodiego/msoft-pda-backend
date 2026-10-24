import { Router } from "express";
import { loginBodySchema } from "../dto/auth.dto.js";
import { validateBody } from "../middleware/validate.js";

export function createAuthRouter(authController: {
  register: any;
  login: any;
}) {
  const router = Router();

  router.post("/register", validateBody(loginBodySchema), authController.register);
  router.post("/login", validateBody(loginBodySchema), authController.login);

  return router;
}
