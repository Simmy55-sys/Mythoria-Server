import { Transform } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateCategoryDto {
  @IsString()
  @Transform(({ value }) => value.toLowerCase())
  @IsNotEmpty()
  name: string;
}
