import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
  IsInt,
  IsDateString,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";

export class CreateChapterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  content?: string; // Optional when file is uploaded

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value === "true";
    }
    return value;
  })
  isPremium?: boolean = true;

  @IsDateString()
  publishDate: Date;

  @IsString()
  language: string;

  @IsInt()
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return parseInt(value, 10);
    }
    return value;
  })
  priceInCoins?: number = 20;

  @IsInt()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return parseInt(value, 10);
    }
    return value;
  })
  chapterNumber: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  fileUrl?: string; // URL to the original file in Cloudinary
}
