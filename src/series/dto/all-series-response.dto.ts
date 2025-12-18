import { Expose, Transform } from "class-transformer";
import { Category } from "src/model/category.entity";

export class AllSeriesChapterDto {
  @Expose()
  id: string;

  @Expose()
  chapterNumber: number;

  @Expose()
  isPremium: boolean;

  @Expose()
  publishDate: Date;
}

export class AllSeriesResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  featuredImage: string;

  @Expose()
  status: string;

  @Expose()
  novelType: string;

  @Expose()
  @Transform(
    ({ obj }) =>
      obj?.categories?.map((category: Category) => category.name) ?? [],
  )
  categories: string[];

  @Expose()
  @Transform(({ obj }) => {
    // Calculate average rating from ratings array
    const ratings = obj?.ratings || [];
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc: number, r: any) => acc + r.rating, 0);
    return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
  })
  averageRating: number;

  @Expose()
  @Transform(({ obj }) => {
    // Get the 2 most recent chapters, ordered by publish date
    const chapters = obj.chapters || [];
    const sortedChapters = chapters
      .sort((a: any, b: any) => {
        const dateA = new Date(a.publishDate).getTime();
        const dateB = new Date(b.publishDate).getTime();
        return dateB - dateA; // Descending order
      })
      .slice(0, 2); // Get top 2

    return sortedChapters.map((chapter: any) => ({
      id: chapter.id,
      chapterNumber: chapter.chapterNumber,
      isPremium: chapter.isPremium,
      publishDate: chapter.publishDate,
    }));
  })
  recentChapters: AllSeriesChapterDto[];
}

export class AllSeriesListResponseDto {
  @Expose()
  data: AllSeriesResponseDto[];

  @Expose()
  total: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;
}
