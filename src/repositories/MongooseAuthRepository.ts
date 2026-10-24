import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const UserModel = require("../models/user.js");

export class MongooseAuthRepository {
  async findByEmail(email: string): Promise<any | null> {
    return UserModel.findOne({ email });
  }

  async createUser(userData: any): Promise<any> {
    const newUser = new UserModel(userData);
    return newUser.save();
  }
}
