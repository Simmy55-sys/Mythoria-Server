import { OmitType } from "@nestjs/mapped-types";
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  MinLength,
} from "class-validator";
import { Role } from "src/global/enum";

export class CreateUserDto {
  @IsNotEmpty()
  username: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @IsOptional()
  @IsEnum(Role, { message: "Invalid role" })
  role?: Role;
}

export class CreateTranslatorDto extends OmitType(CreateUserDto, [
  "password",
  "role",
] as const) {}
