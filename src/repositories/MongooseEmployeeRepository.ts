import type { Employee } from "../domain/Employee.js";
import type { IEmployeeRepository } from "./IEmployeeRepository.js";
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const EmployeeModel = require('../models/empleado.js');

export class MongooseEmployeeRepository implements IEmployeeRepository {
    async findAll(): Promise<Employee[]> {
      return EmployeeModel.find();
    }
    async create(employee: Employee): Promise<Employee> {
      return EmployeeModel.create(employee);
    }
    async update(id: string, employee: Employee): Promise<Employee | null> {
      return EmployeeModel.findByIdAndUpdate(id, employee, { new: true });
    }
    async delete(id: string): Promise<boolean> {
      await EmployeeModel.findByIdAndDelete(id);
      return true;
    }
  }