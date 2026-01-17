import { Module } from "@nestjs/common";
import { AccountService } from "./account.service";
import { AccountController } from "./account.controller";
import { PasswordModule } from "src/password/password.module";
import { UserModule } from "src/user/user.module";
import { EmailModule } from "src/email/email.module";
import { JwtStrategy } from "./jwt-strategy";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JWT_SECRET } from "src/config/env";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PasswordResetToken } from "src/model/password-reset-token.entity";

@Module({
  imports: [
    UserModule,
    PasswordModule,
    EmailModule,
    TypeOrmModule.forFeature([PasswordResetToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>(JWT_SECRET),
        signOptions: { expiresIn: "30d" },
      }),
    }),
  ],
  providers: [AccountService, JwtStrategy],
  controllers: [AccountController],
  exports: [AccountService],
})
export class AccountModule {}
