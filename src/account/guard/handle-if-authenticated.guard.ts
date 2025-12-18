// Assign user to request if authenticated else just continue without assigning

import { ExecutionContext, Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class HandleIfAuthenticatedGuard extends AuthGuard("jwt") {
  // Do NOT throw when no token is provided
  handleRequest(err, user, info) {
    if (err || info || !user) {
      return null; // <-- keep request going, just without req.user
    }
    return user;
  }

  canActivate(context: ExecutionContext) {
    // Call AuthGuard's canActivate() to trigger JWT passport
    const activate = super.canActivate(context);

    // Allow promise OR boolean
    if (activate instanceof Promise) return activate.catch(() => true);

    return true;
  }
}
