import { Expose, Transform } from "class-transformer";
import { Category } from "src/model/category.entity";

export class SeriesDetailsChapterDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  chapterNumber: number;

  @Expose()
  isPremium: boolean;

  @Expose()
  publishDate: Date;

  @Expose()
  priceInCoins: number;
}

export class SeriesDetailsResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  author: string;

  @Expose()
  translatorName: string;

  @Expose()
  description: string;

  @Expose()
  featuredImage: string;

  @Expose()
  status: string;

  @Expose()
  novelType: string;

  @Expose()
  originalLanguage: string;

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
    // Count total ratings
    return obj?.ratings?.length || 0;
  })
  totalRatings: number;

  @Expose()
  @Transform(({ obj }) => {
    // Calculate total views (sum of all chapter readCount)
    const chapters = obj?.chapters || [];
    return chapters.reduce(
      (sum: number, chapter: any) => sum + Number(chapter.readCount || 0),
      0,
    );
  })
  totalViews: number;

  @Expose()
  @Transform(({ obj }) => {
    // Count total bookmarks
    return obj?.bookmarks?.length || 0;
  })
  totalBookmarks: number;

  @Expose()
  @Transform(({ obj }) => {
    // Count total likes
    return obj?.likes?.length || 0;
  })
  totalLikes: number;

  @Expose()
  chapters: SeriesDetailsChapterDto[];

  @Expose()
  totalChapters: number;
}

export class SeriesDetailsListResponseDto {
  @Expose()
  series: SeriesDetailsResponseDto;

  @Expose()
  chapters: SeriesDetailsChapterDto[];

  @Expose()
  totalChapters: number;

  @Expose()
  page: number;

  @Expose()
  limit: number;

  @Expose()
  totalPages: number;
}
