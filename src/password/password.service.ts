import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcrypt";

@Injectable()
export class PasswordService {
  constructor() {}

  async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async comparePasswords(unHashedPsw: string, hashedPsw: string) {
    return bcrypt.compare(unHashedPsw, hashedPsw);
  }
}
