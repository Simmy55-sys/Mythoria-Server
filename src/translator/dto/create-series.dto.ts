import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateSeriesDto {
  @IsString()
  @IsNotEmpty()
  assignmentId: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  categories: string; // comma separated string of categories

  @IsString()
  @IsNotEmpty()
  author: string;

  @IsString()
  @IsNotEmpty()
  status: "ongoing" | "completed";

  @IsString()
  novelType: "novel" | "manga" | "manhwa";

  @IsString()
  originalLanguage: string;

  @IsString()
  @IsOptional()
  featuredImage?: string;
}
