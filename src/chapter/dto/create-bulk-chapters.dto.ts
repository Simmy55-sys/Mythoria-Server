import { IsArray, ValidateNested } from "class-validator";
import { Transform, Type } from "class-transformer";
import { CreateChapterDto } from "./create-chapter.dto";

export class CreateBulkChaptersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateChapterDto)
  @Transform(({ value }) =>
    typeof value === "string" ? JSON.parse(value) : value,
  )
  chapters: CreateChapterDto[];
}
