import { Expose, Transform } from "class-transformer";

export class LatestSeriesChapterDto {
  @Expose()
  id: string;

  @Expose()
  chapterNumber: number;

  @Expose()
  isPremium: boolean;

  @Expose()
  publishDate: Date;
}

export class LatestSeriesResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  slug: string;

  @Expose()
  featuredImage: string;

  @Expose()
  @Transform(({ obj }) => {
    // Get the 4 most recent chapters, ordered by publish date
    const chapters = obj.chapters || [];
    const sortedChapters = chapters
      .sort((a: any, b: any) => {
        const dateA = new Date(a.publishDate).getTime();
        const dateB = new Date(b.publishDate).getTime();
        return dateB - dateA; // Descending order
      })
      .slice(0, 4); // Get top 4

    return sortedChapters.map((chapter: any) => ({
      id: chapter.id,
      chapterNumber: chapter.chapterNumber,
      isPremium: chapter.isPremium,
      publishDate: chapter.publishDate,
    }));
  })
  recentChapters: LatestSeriesChapterDto[];
}
