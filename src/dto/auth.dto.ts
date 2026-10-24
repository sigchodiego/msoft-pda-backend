import { z } from "zod";

export const loginBodySchema = z.object({
  email: z
    .string()
    .trim()
    .email("El formato del correo electrónico proporcionado no es válido"),
  password: z
    .string()
    .min(6, "La credencial de acceso debe poseer una longitud mínima de 6 caracteres"),
});
