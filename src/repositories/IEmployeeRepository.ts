import type { Employee } from "../domain/Employee.js";

export interface IEmployeeRepository {
    findAll(): Promise<Employee[]>;
    create(employee: Employee): Promise<Employee>;
    update(id: string, employee: Employee): Promise<Employee | null>;
    delete(id: string): Promise<boolean>;
}