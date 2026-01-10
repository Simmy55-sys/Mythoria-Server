import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsDateString,
  MaxLength,
} from "class-validator";

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(["info", "warning", "success", "error"])
  @IsOptional()
  type?: "info" | "warning" | "success" | "error" = "info";

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string | null;
}

