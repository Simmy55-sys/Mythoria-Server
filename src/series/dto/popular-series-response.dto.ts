import { Expose, Transform } from "class-transformer";
import { Category } from "src/model/category.entity";

export class PopularSeriesResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  featuredImage: string;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj?.categories?.map((category: Category) => category.name) ?? [],
  )
  categories: string[];
}
