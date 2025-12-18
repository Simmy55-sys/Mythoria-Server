import { Injectable } from "@nestjs/common";
import { UserRoleGuard } from "./factory.guard";
import { Role } from "src/global/enum";

@Injectable()
export class IsReader extends UserRoleGuard {
  constructor() {
    super();
  }

  role = Role.READER;
}
