import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Query,
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
import { UserService } from "src/user/user.service";
import {
  CLIENT_BASE_URL,
  DISCORD_AUTHORIZATION_LINK,
  GOOGLE_CLIENT_ID,
  GOOGLE_REDIRECT_URI,
} from "src/config/env";
import { ConfigService } from "@nestjs/config";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ResetAdminPasswordDto } from "./dto/reset-admin-password.dto";

@Controller("account")
export class AccountController {
  constructor(
    private accountService: AccountService,
    private userService: UserService,
    private configService: ConfigService,
  ) {}

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

  @Post("reader/discord/authenticate")
  async readerDiscordAuthenticate(
    @Res() response: Response,
    @Query("state") state: string,
  ) {
    const discordAuthUrl =
      this.configService.getOrThrow<string>(DISCORD_AUTHORIZATION_LINK) +
      `&state=${state}`;

    // Redirect to Discord authorization URL
    return response.redirect(discordAuthUrl);
  }

  @Get("reader/discord/callback")
  async readerDiscordCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() response: Response,
  ) {
    const params: { redirect?: string; action: "login" | "register" } =
      JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
    const { redirect, action } = params;

    if (!code) {
      return response.redirect(
        `${this.configService.getOrThrow<string>(CLIENT_BASE_URL)}/account/${action}?error=discord_auth_failed&redirect=${redirect || ""}`,
      );
    }

    try {
      const { accessToken, user } =
        await this.accountService.handleDiscordCallback(
          code,
          action || "login",
          Role.READER,
        );

      // Also set the generic accessToken for backward compatibility
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

      // Redirect to the specified page or home
      const clientBaseUrl =
        this.configService.getOrThrow<string>(CLIENT_BASE_URL);
      const redirectUrl = redirect
        ? `${clientBaseUrl}/${redirect}`
        : `${clientBaseUrl}/`;

      return response.redirect(redirectUrl);
    } catch (error: any) {
      const clientBaseUrl =
        this.configService.getOrThrow<string>("CLIENT_BASE_URL");
      const errorMessage = encodeURIComponent(
        error.message || "Discord authentication failed",
      );
      return response.redirect(
        `${clientBaseUrl}/account/${action}?error=${errorMessage}&redirect=${redirect || ""}`,
      );
    }
  }

  @Post("reader/google/authenticate")
  async readerGoogleAuthenticate(
    @Res() response: Response,
    @Query("state") state: string,
  ) {
    const googleAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    // convert options to search params
    const options = {
      redirect_uri: this.configService.getOrThrow<string>(GOOGLE_REDIRECT_URI),
      client_id: this.configService.getOrThrow<string>(GOOGLE_CLIENT_ID),
      access_type: "offline",
      prompt: "consent",
      response_type: "code",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
    };
    return response.redirect(
      googleAuthUrl +
        "?" +
        new URLSearchParams(options).toString() +
        "&state=" +
        state,
    );
  }

  @Get("reader/google/callback")
  async readerGoogleCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() response: Response,
  ) {
    // Parse state parameter to get redirect and action
    const params: { redirect?: string; action: "login" | "register" } =
      JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
    const { redirect, action } = params;

    if (!code) {
      return response.redirect(
        `${this.configService.getOrThrow<string>(CLIENT_BASE_URL)}/account/${action}?error=google_auth_failed&redirect=${redirect || ""}`,
      );
    }

    try {
      const { accessToken, user } =
        await this.accountService.handleGoogleCallback(
          code,
          action || "login",
          Role.READER,
        );

      // Set JWT token as HTTP-only cookie
      response.cookie("readerAccessToken", accessToken, {
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

      // Also set the generic accessToken for backward compatibility
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

      // Redirect to the specified page or home
      const clientBaseUrl =
        this.configService.getOrThrow<string>(CLIENT_BASE_URL);
      const redirectUrl = redirect
        ? `${clientBaseUrl}/${redirect}`
        : `${clientBaseUrl}/`;

      return response.redirect(redirectUrl);
    } catch (error: any) {
      const clientBaseUrl =
        this.configService.getOrThrow<string>(CLIENT_BASE_URL);
      const errorMessage = encodeURIComponent(
        error.message || "Google authentication failed",
      );
      return response.redirect(
        `${clientBaseUrl}/account/${action}?error=${errorMessage}&redirect=${redirect || ""}`,
      );
    }
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
    response.cookie("adminAccessToken", accessToken, {
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

    const userData = await this.userService.getProfile(user?.id ?? "");
    return userResponseTransformer(userData);
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) response: Response) {
    // Clear all possible access token cookies (no auth required to clear cookies)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      domain:
        process.env.NODE_ENV === "production"
          ? ".mythoriatales.com"
          : "localhost",
    };

    response.clearCookie("readerAccessToken", cookieOptions);
    response.clearCookie("adminAccessToken", cookieOptions);
    response.clearCookie("accessToken", cookieOptions); // Fallback for backward compatibility

    return { message: "Logged out successfully" };
  }

  @Post("forgot-password")
  @HttpCode(200)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.accountService.forgotPassword(dto, Role.READER);
  }

  @Post("reset-password")
  @HttpCode(200)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.accountService.resetPassword(dto, Role.READER);
  }

  @Get("validate-reset-token")
  async validateResetToken(@Query("token") token: string) {
    return this.accountService.validateResetToken(token, Role.READER);
  }

  @Post("translator/forgot-password")
  @HttpCode(200)
  async translatorForgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.accountService.forgotPassword(dto, Role.TRANSLATOR);
  }

  @Post("translator/reset-password")
  @HttpCode(200)
  async translatorResetPassword(@Body() dto: ResetPasswordDto) {
    return this.accountService.resetPassword(dto, Role.TRANSLATOR);
  }

  @Get("translator/validate-reset-token")
  async translatorValidateResetToken(@Query("token") token: string) {
    return this.accountService.validateResetToken(token, Role.TRANSLATOR);
  }

  @Post("admin/reset-password")
  @HttpCode(200)
  async resetAdminPassword(@Body() dto: ResetAdminPasswordDto) {
    return this.accountService.resetAdminPassword(dto);
  }
}
