import { Injectable } from "@nestjs/common";
import { UserRoleGuard } from "./factory.guard";
import { Role } from "src/global/enum";

@Injectable()
export class IsAdmin extends UserRoleGuard {
  constructor() {
    super();
  }

  role = Role.ADMIN;
}
