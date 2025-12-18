import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { Role } from "src/global/enum";

@Injectable()
export abstract class UserRoleGuard {
  abstract readonly role: Role;

  async canActivate(context: ExecutionContext) {
    const request: Request = context.switchToHttp().getRequest();

    const { user } = request;
    if (!user)
      throw new UnauthorizedException(
        "User not authorised to access this route.",
      );

    const { role: userRole } = user;

    if (this.role === userRole) return true;

    throw new UnauthorizedException(
      "User does not have the appropriate role for this route. Expected role of " +
        this.role,
    );
  }
}
