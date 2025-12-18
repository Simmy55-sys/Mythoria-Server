import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { PasswordModule } from "src/password/password.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "src/model/user.entity";
import { UserController } from './user.controller';

@Module({
  imports: [PasswordModule, TypeOrmModule.forFeature([User])],
  providers: [UserService],
  exports: [UserService],
  controllers: [UserController],
})
export class UserModule {}
