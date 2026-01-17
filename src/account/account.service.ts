import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PasswordService } from "src/password/password.service";
import { UserService } from "src/user/user.service";
import { EmailService } from "src/email/email.service";
import { EntityManager } from "typeorm";
import { LoginDto } from "./dto/login.dto";
import { JwtService } from "@nestjs/jwt";
import { Role } from "src/global/enum";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import { ConfigService } from "@nestjs/config";
import {
  DISCORD_CLIENT_ID,
  DISCORD_SECRET_KEY,
  CLIENT_BASE_URL,
  DISCORD_REDIRECT_URI,
  GOOGLE_CLIENT_ID,
  GOOGLE_SECRET_KEY,
  GOOGLE_REDIRECT_URI,
  TRANSLATOR_BASE_URL,
} from "src/config/env";
import { PasswordResetToken } from "src/model/password-reset-token.entity";
import { Repository } from "typeorm";
import { randomBytes } from "crypto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ResetAdminPasswordDto } from "./dto/reset-admin-password.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { ADMIN_MASTER_KEY } from "src/config/env";

@Injectable()
export class AccountService {
  constructor(
    private userService: UserService,
    private passwordService: PasswordService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepo: Repository<PasswordResetToken>,
  ) {}

  async changeUserPassword(
    userId: string,
    password: { new: string; old: string },
    transactionalEntity?: EntityManager,
  ) {
    const user = await this.userService.findOne(
      {
        where: { id: userId },
      },
      transactionalEntity,
    );

    if (!user) throw new NotFoundException("User not found");

    // Compare old password
    const isMatch = await this.passwordService.comparePasswords(
      password.old,
      user.password ?? "",
    );
    if (!isMatch) throw new BadRequestException("Old password is incorrect");

    // Hash new password
    const hashedNewPassword = await this.passwordService.hashPassword(
      password.new,
    );

    // Update user record
    await this.userService.updateUser(
      userId,
      { password: hashedNewPassword },
      transactionalEntity,
    );

    return { message: "Password changed successfully" };
  }

  async registerReader(
    registerReaderDto: CreateUserDto,
    transactionalEntity?: EntityManager,
  ) {
    const existingUser = await this.userService.findOne({
      where: { email: registerReaderDto.email, role: Role.READER },
    });
    if (existingUser)
      throw new BadRequestException("Reader with this email already exists");

    const user = await this.userService.create(
      { ...registerReaderDto, role: Role.READER },
      transactionalEntity,
    );
    return user;
  }

  async registerTranslator(
    registerTranslatorDto: CreateUserDto,
    transactionalEntity?: EntityManager,
  ) {
    const existingTranslator = await this.userService.findOne({
      where: { email: registerTranslatorDto.email, role: Role.TRANSLATOR },
    });
    if (existingTranslator)
      throw new BadRequestException(
        "Translator with this email already exists",
      );

    const translator = await this.userService.create(
      { ...registerTranslatorDto, role: Role.TRANSLATOR },
      transactionalEntity,
    );
    return translator;
  }

  async login(
    loginDto: LoginDto,
    role: Role,
    transactionalEntity?: EntityManager,
  ) {
    const user = await this.userService.findOne(
      {
        where: { email: loginDto.email, role },
      },
      transactionalEntity,
    );
    if (!user) throw new UnauthorizedException("Invalid password or email");

    // Check if user has password (not OAuth user)
    if (!user.password) {
      if (role === Role.READER)
        throw new UnauthorizedException(
          "Please reset your password. Or sign in with Discord or Google to continue.",
        );

      throw new UnauthorizedException("Please reset your password.");
    }

    const isMatch = await this.passwordService.comparePasswords(
      loginDto.password,
      user.password,
    );
    if (!isMatch) throw new UnauthorizedException("Invalid password or email");

    const payload = { id: user.id, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async handleDiscordCallback(
    code: string,
    action: "login" | "register",
    role: Role = Role.READER,
    transactionalEntity?: EntityManager,
  ) {
    const clientId = this.configService.getOrThrow<string>(DISCORD_CLIENT_ID);
    const clientSecret =
      this.configService.getOrThrow<string>(DISCORD_SECRET_KEY);
    const redirectUri =
      this.configService.getOrThrow<string>(DISCORD_REDIRECT_URI);

    // Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Encoding": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      console.log(tokenResponse);
      throw new BadRequestException(
        "Failed to exchange Discord code for token",
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Discord
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new BadRequestException("Failed to fetch Discord user info");
    }

    const discordUser = await userResponse.json();

    // Extract email and username from Discord
    const email = discordUser.email;
    const username =
      discordUser.username ||
      discordUser.global_name ||
      `discord_${discordUser.id}`;

    if (!email) {
      throw new BadRequestException(
        "Discord account does not have an email address",
      );
    }

    if (action === "register") {
      // Check if user already exists
      const existingUser = await this.userService.findOne({
        where: { email, role },
      });

      if (existingUser) {
        throw new BadRequestException(
          "An account with this email already exists. Please login instead.",
        );
      }

      // Create new user with Discord auth
      const user = await this.userService.createOauthUser(
        {
          username,
          email,
          role,
          authType: "discord",
        },
        transactionalEntity,
      );

      const payload = { id: user.id, role: user.role };
      return {
        accessToken: this.jwtService.sign(payload),
        user,
      };
    } else {
      // Login: Find existing user
      const user = await this.userService.findOne({
        where: { email, role },
      });

      if (!user) {
        throw new UnauthorizedException(
          "No account found with this Discord email. Please register first.",
        );
      }

      const payload = { id: user.id, role: user.role };
      return {
        accessToken: this.jwtService.sign(payload),
        user,
      };
    }
  }

  async handleGoogleCallback(
    code: string,
    action: "login" | "register",
    role: Role = Role.READER,
    transactionalEntity?: EntityManager,
  ) {
    const clientId = this.configService.getOrThrow<string>(GOOGLE_CLIENT_ID);
    const clientSecret =
      this.configService.getOrThrow<string>(GOOGLE_SECRET_KEY);
    const redirectUri =
      this.configService.getOrThrow<string>(GOOGLE_REDIRECT_URI);

    // Exchange code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new BadRequestException("Failed to exchange Google code for token");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Google
    const userResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!userResponse.ok) {
      throw new BadRequestException("Failed to fetch Google user info");
    }

    const googleUser = await userResponse.json();

    // Extract email and username from Google
    const email = googleUser.email;
    const username =
      googleUser.given_name || googleUser.name || `google_${googleUser.id}`;

    if (!email) {
      throw new BadRequestException(
        "Google account does not have an email address",
      );
    }

    if (action === "register") {
      // Check if user already exists
      const existingUser = await this.userService.findOne({
        where: { email, role },
      });

      if (existingUser) {
        throw new BadRequestException(
          "An account with this email already exists. Please login instead.",
        );
      }

      // Create new user with Google auth
      const user = await this.userService.createOauthUser(
        {
          username,
          email,
          role,
          authType: "google",
        },
        transactionalEntity,
      );

      const payload = { id: user.id, role: user.role };
      return {
        accessToken: this.jwtService.sign(payload),
        user,
      };
    } else {
      // Login: Find existing user
      const user = await this.userService.findOne({
        where: { email, role },
      });

      if (!user) {
        throw new UnauthorizedException(
          "No account found with this Google email. Please register first.",
        );
      }

      const payload = { id: user.id, role: user.role };
      return {
        accessToken: this.jwtService.sign(payload),
        user,
      };
    }
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
    role: Role = Role.READER,
    transactionalEntity?: EntityManager,
  ) {
    // Find user by email and role
    const user = await this.userService.findOne({
      where: { email: dto.email, role },
    });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      return {
        message: "If the email exists, a password reset link has been sent.",
      };
    }

    // Generate reset token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

    // Invalidate any existing tokens for this user
    await (transactionalEntity || this.passwordResetTokenRepo.manager).update(
      PasswordResetToken,
      { userId: user.id, isUsed: false },
      { isUsed: true },
    );

    // Create new reset token
    const resetToken = this.passwordResetTokenRepo.create({
      userId: user.id,
      token,
      expiresAt,
      isUsed: false,
    });

    await (transactionalEntity || this.passwordResetTokenRepo.manager).save(
      PasswordResetToken,
      resetToken,
    );

    // Build reset URL based on role
    let baseUrl = this.configService.getOrThrow<string>(CLIENT_BASE_URL);
    if (role === Role.TRANSLATOR)
      baseUrl = this.configService.getOrThrow<string>(TRANSLATOR_BASE_URL);
    const resetPath = "/account/reset-password";
    const resetUrl = `${baseUrl}${resetPath}?token=${token}`;

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        resetUrl,
        role === Role.TRANSLATOR ? "translator" : "reader",
      );
    } catch (error) {
      // Log error but don't reveal to user (security best practice)
      console.error("Failed to send password reset email:", error);
      // Still return success message to prevent email enumeration
    }

    return {
      message: "If the email exists, a password reset link has been sent.",
    };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    role: Role = Role.READER,
    transactionalEntity?: EntityManager,
  ) {
    // Find the reset token
    const resetToken = await (
      transactionalEntity || this.passwordResetTokenRepo.manager
    ).findOne(PasswordResetToken, {
      where: { token: dto.token, isUsed: false },
      relations: ["user"],
    });

    if (!resetToken) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException("Reset token has expired");
    }

    // Check if user exists and matches role
    if (!resetToken.user || resetToken.user.role !== role) {
      throw new BadRequestException("Invalid reset token");
    }

    // Hash new password
    const hashedPassword = await this.passwordService.hashPassword(
      dto.newPassword,
    );

    // Update user password
    await this.userService.updateUser(
      resetToken.userId,
      { password: hashedPassword },
      transactionalEntity,
    );

    // delete password reset token
    await (transactionalEntity || this.passwordResetTokenRepo.manager).delete(
      PasswordResetToken,
      { id: resetToken.id },
    );

    return { message: "Password has been reset successfully" };
  }

  async validateResetToken(
    token: string,
    role: Role = Role.READER,
  ): Promise<{ valid: boolean; message?: string }> {
    // Find the reset token
    const resetToken = await this.passwordResetTokenRepo.findOne({
      where: { token, isUsed: false },
      relations: ["user"],
    });

    if (!resetToken) {
      return { valid: false, message: "Invalid reset token" };
    }

    // Check if token is expired
    if (new Date() > resetToken.expiresAt) {
      return { valid: false, message: "Reset token has expired" };
    }

    // Check if user exists and matches role
    if (!resetToken.user || resetToken.user.role !== role) {
      return { valid: false, message: "Invalid reset token" };
    }

    return { valid: true };
  }

  async resetAdminPassword(dto: ResetAdminPasswordDto) {
    // Verify master key
    const masterKey = this.configService.getOrThrow<string>(ADMIN_MASTER_KEY);
    if (dto.masterKey !== masterKey) {
      throw new UnauthorizedException("Invalid master key");
    }

    // Find admin user (there should only be one admin)
    const admin = await this.userService.findOne({
      where: { role: Role.ADMIN },
    });

    if (!admin) {
      throw new NotFoundException("Admin user not found");
    }

    // Hash new password
    const hashedPassword = await this.passwordService.hashPassword(
      dto.newPassword,
    );

    // Update admin password
    await this.userService.updateUser(admin.id, {
      password: hashedPassword,
    });

    return { message: "Admin password has been reset successfully" };
  }
}
