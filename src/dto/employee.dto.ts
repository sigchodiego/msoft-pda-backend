import { z } from "zod";

export const employeeBodySchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(3, "nombre debe tener al menos 3 caracteres"),
  cargo: z
    .string()
    .trim()
    .min(3, "cargo debe tener al menos 3 caracteres"),
  departamento: z
    .string()
    .trim()
    .min(2, "departamento debe tener al menos 2 caracteres"),
  sueldo: z.coerce
    .number()
    .positive("sueldo debe ser un número positivo")
    .min(100, "sueldo mínimo es 100"),
});

export const employeeIdSchema = z.object({
  id: z.string().min(1, "id es requerido"),
});
