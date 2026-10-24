import { Router } from "express";
import { employeeBodySchema, employeeIdSchema } from "../dto/employee.dto.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import { requireDb } from "../middleware/requireDb.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";

export function createEmpleadosRouter(empleadoController: {
  getEmpleado: any;
  addEmpleado: any;
  updateEmpleado: any;
  deleteEmpleado: any;
}) {
  const router = Router();

  router.get("/empleados", requireDb, empleadoController.getEmpleado);
  router.post(
    "/empleados",
    authenticateJWT,
    requireDb,
    validateBody(employeeBodySchema),
    empleadoController.addEmpleado
  );
  router.put(
    "/empleados/:id",
    authenticateJWT,
    requireDb,
    validateParams(employeeIdSchema),
    validateBody(employeeBodySchema),
    empleadoController.updateEmpleado
  );
  router.delete(
    "/empleados/:id",
    authenticateJWT,
    requireDb,
    validateParams(employeeIdSchema),
    empleadoController.deleteEmpleado
  );

  return router;
}
