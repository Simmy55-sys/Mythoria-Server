import { Expose, Transform, Type } from "class-transformer";
import { ChapterResponseDto } from "./chapter-response.dto";
import { CategoryResponseDto } from "./category-response.dto";
import { Category } from "src/model/category.entity";

export class SeriesResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  translatorName: string;

  @Expose()
  slug: string;

  @Expose()
  author: string;

  @Expose()
  description: string;

  @Expose()
  novelType: string;

  @Expose()
  originalLanguage: string;

  @Expose()
  featuredImage: string;

  @Expose()
  chapters: ChapterResponseDto[];

  @Expose()
  status: string;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj?.categories?.map((category: Category) => category.name) ?? [],
  )
  categories: string[];
}
