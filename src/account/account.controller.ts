import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { AccountService } from "./account.service";
import { Request, Response } from "express";
import { IsAuthenticated } from "src/account/guard/is-authenticated.guard";
import { Role } from "src/global/enum";
import { LoginDto } from "./dto/login.dto";
import { userResponseTransformer } from "src/transformers/user.transformer";
import { CreateUserDto } from "src/user/dto/create-user.dto";

@Controller("account")
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Patch("change-password")
  @UseGuards(IsAuthenticated)
  async changePassword(
    @Req() request: Request,
    @Body() _body: ChangePasswordDto,
  ) {
    const { user } = request;

    return this.accountService.changeUserPassword(user?.id ?? "", {
      new: _body.newPassword,
      old: _body.oldPassword,
    });
  }

  @Post("reader/register")
  async readerRegister(
    @Body() _body: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const reader = await this.accountService.registerReader(_body);

    // Auto-login after registration
    const { accessToken } = await this.accountService.login(
      { email: _body.email, password: _body.password },
      Role.READER,
    );

    // Set JWT token as HTTP-only cookie
    response.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
      domain:
        process.env.NODE_ENV === "production"
          ? ".mythoriatales.com"
          : "localhost",
    });

    return userResponseTransformer(reader);
  }

  @Post("reader/login")
  @HttpCode(200)
  async readerLogin(
    @Body() _body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, user: reader } = await this.accountService.login(
      _body,
      Role.READER,
    );

    // Set JWT token as HTTP-only cookie
    response.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
      domain:
        process.env.NODE_ENV === "production"
          ? ".mythoriatales.com"
          : "localhost",
    });

    return {
      user: userResponseTransformer(reader),
    };
  }

  @Post("translator/login")
  @HttpCode(200)
  async translatorLogin(@Body() _body: LoginDto) {
    const { accessToken, user: translator } = await this.accountService.login(
      _body,
      Role.TRANSLATOR,
    );
    return {
      accessToken,
      user: userResponseTransformer(translator),
    };
  }

  @Post("admin/login")
  @HttpCode(200)
  async adminLogin(
    @Body() _body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, user: admin } = await this.accountService.login(
      _body,
      Role.ADMIN,
    );

    // Set JWT token as HTTP-only cookie
    response.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: "/",
      domain:
        process.env.NODE_ENV === "production"
          ? ".mythoriatales.com"
          : "localhost",
    });

    return {
      user: userResponseTransformer(admin),
    };
  }

  @Get("me")
  @UseGuards(IsAuthenticated)
  async getCurrentUser(@Req() request: Request) {
    const { user } = request;
    if (!user) {
      throw new UnauthorizedException("User not authenticated");
    }
    return userResponseTransformer(user);
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) response: Response) {
    // Clear the access token cookie (no auth required to clear cookie)
    response.clearCookie("accessToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return { message: "Logged out successfully" };
  }
}
