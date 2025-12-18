import transformerFactory from "./factory";
import { ChapterResponseDto } from "./dto/chapter-response.dto";
import { Chapter } from "src/model/chapter.entity";

export function chapterResponseTransformer(chapter: Partial<Chapter>) {
  return transformerFactory(chapter, ChapterResponseDto);
}
