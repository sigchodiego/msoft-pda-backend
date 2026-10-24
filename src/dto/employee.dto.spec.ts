import { describe, expect, it } from "@jest/globals";
import { employeeBodySchema, employeeIdSchema } from "./employee.dto.js";

describe("Unit Test: employee.dto (Zod)", () => {
  it("exito: acepta body valido", () => {
    const result = employeeBodySchema.safeParse({
      nombre: "Andres Mendoza",
      cargo: "Software Architect",
      departamento: "I+D",
      sueldo: 4200,
    });

    expect(result.success).toBe(true);
  });

  it("exito: acepta id de params valido", () => {
    const result = employeeIdSchema.safeParse({ id: "64f1a2b3c4d5" });
    expect(result.success).toBe(true);
  });

  it("fallo: rechaza nombre corto y sueldo ilegal", () => {
    const result = employeeBodySchema.safeParse({
      nombre: "Al",
      cargo: "Dev",
      departamento: "TI",
      sueldo: -500,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path.join("."));
      expect(paths).toEqual(expect.arrayContaining(["nombre", "sueldo"]));
    }
  });

  it("fallo: rechaza id vacio", () => {
    const result = employeeIdSchema.safeParse({ id: "" });
    expect(result.success).toBe(false);
  });
});
