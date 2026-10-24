import type { NextFunction, Request, Response } from "express";
import type { IEmployeeRepository } from "../repositories/IEmployeeRepository.js";
import { ok } from "../utils/apiResponse.js";

export function createEmployeeController(repo: IEmployeeRepository) {
  return {
    getEmpleado: async (_req: Request, res: Response, next: NextFunction) => {
      try {
        const empleados = await repo.findAll();
        return ok(res, empleados, "Empleados obtenidos");
      } catch (err) {
        return next(err);
      }
    },

    addEmpleado: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const empleado = await repo.create(req.body);
        return ok(res, empleado, "Empleado guardado", 201);
      } catch (err) {
        return next(err);
      }
    },

    updateEmpleado: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const empleado = await repo.update(req.params.id as string, req.body);
        return ok(res, empleado, "Empleado actualizado");
      } catch (err) {
        return next(err);
      }
    },

    deleteEmpleado: async (req: Request, res: Response, next: NextFunction) => {
      try {
        await repo.delete(req.params.id as string);
        return ok(res, null, "Empleado eliminado");
      } catch (err) {
        return next(err);
      }
    },
  };
}
