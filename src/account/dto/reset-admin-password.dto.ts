import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class ResetAdminPasswordDto {
  @IsString()
  @IsNotEmpty()
  masterKey: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword: string;
}

