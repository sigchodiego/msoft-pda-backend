import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";
import { createEmployeeController } from "./empleados.controllers.js";
import type { IEmployeeRepository } from "../repositories/IEmployeeRepository.js";

describe("Unit Test: EmployeeController (Mantenibilidad & Testabilidad)", () => {
  let controller: ReturnType<typeof createEmployeeController>;
  let mockRepository: jest.Mocked<IEmployeeRepository>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;
  let nextMock: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    mockRepository = {
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    controller = createEmployeeController(mockRepository);

    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    mockResponse = { status: statusMock };
    nextMock = jest.fn();
  });

  it("exito: getEmpleado retorna 200 con la lista del repositorio", async () => {
    const fakeEmployees = [
      {
        nombre: "Andres Mendoza",
        cargo: "Arquitecto",
        departamento: "TI",
        sueldo: 4000,
      },
    ];

    mockRepository.findAll.mockResolvedValue(fakeEmployees);
    mockRequest = {};

    await controller.getEmpleado(
      mockRequest as Request,
      mockResponse as Response,
      nextMock
    );

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      message: "Empleados obtenidos",
      data: fakeEmployees,
    });
    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    expect(nextMock).not.toHaveBeenCalled();
  });

  it("exito: addEmpleado retorna 201 al crear con el repositorio", async () => {
    const payload = {
      nombre: "Andres Mendoza",
      cargo: "Software Architect",
      departamento: "I+D",
      sueldo: 4200,
    };
    const created = { ...payload, _id: "abc123" };

    mockRepository.create.mockResolvedValue(created as any);
    mockRequest = { body: payload };

    await controller.addEmpleado(
      mockRequest as Request,
      mockResponse as Response,
      nextMock
    );

    expect(mockRepository.create).toHaveBeenCalledWith(payload);
    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      message: "Empleado guardado",
      data: created,
    });
    expect(nextMock).not.toHaveBeenCalled();
  });

  it("fallo: getEmpleado delega el error del repositorio a next", async () => {
    const error = new Error("fallo de persistencia");
    mockRepository.findAll.mockRejectedValue(error);
    mockRequest = {};

    await controller.getEmpleado(
      mockRequest as Request,
      mockResponse as Response,
      nextMock
    );

    expect(nextMock).toHaveBeenCalledWith(error);
    expect(statusMock).not.toHaveBeenCalled();
  });

  it("fallo: addEmpleado delega el error del repositorio a next", async () => {
    const error = new Error("no se pudo guardar");
    mockRepository.create.mockRejectedValue(error);
    mockRequest = {
      body: {
        nombre: "Andres Mendoza",
        cargo: "Software Architect",
        departamento: "I+D",
        sueldo: 4200,
      },
    };

    await controller.addEmpleado(
      mockRequest as Request,
      mockResponse as Response,
      nextMock
    );

    expect(nextMock).toHaveBeenCalledWith(error);
    expect(statusMock).not.toHaveBeenCalled();
  });
});
