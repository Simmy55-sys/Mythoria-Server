import { IsString, IsNotEmpty, IsOptional, ValidateIf } from "class-validator";

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.chapterId) // seriesId is required if chapterId is not provided
  seriesId?: string;

  @IsString()
  @IsOptional()
  @ValidateIf((o) => !o.seriesId) // chapterId is required if seriesId is not provided
  chapterId?: string;

  @IsString()
  @IsOptional()
  parentCommentId?: string; // For replies
}
