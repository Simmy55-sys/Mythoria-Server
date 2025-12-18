import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { IsAuthenticated } from "src/account/guard/is-authenticated.guard";
import { UserService } from "./user.service";
import { Request } from "express";
import { userResponseTransformer } from "src/transformers/user.transformer";

@Controller("user")
export class UserController {
  constructor(private userService: UserService) {}

  @Get("profile")
  @UseGuards(IsAuthenticated)
  async getProfile(@Req() request: Request) {
    const { user } = request;

    return userResponseTransformer(
      await this.userService.getProfile(user?.id ?? ""),
    );
  }
}
