import { IsOptional, IsString } from "class-validator";

export class UpdateSeriesDto {
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  categories?: string; // comma separated string of categories

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  status?: "ongoing" | "completed";

  @IsString()
  @IsOptional()
  novelType?: "novel" | "manga" | "manhwa";

  @IsString()
  @IsOptional()
  originalLanguage?: string;

  @IsString()
  @IsOptional()
  featuredImage?: string;
}

