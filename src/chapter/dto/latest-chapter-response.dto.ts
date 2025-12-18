import { Expose, Transform } from "class-transformer";

export class LatestChapterResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  chapterNumber: number;

  @Expose()
  publishDate: Date;

  @Expose()
  seriesId: string;

  @Expose()
  @Transform(({ obj }) => ({
    id: obj.series?.id,
    title: obj.series?.title,
    slug: obj.series?.slug,
    featuredImage: obj.series?.featuredImage,
    categories: obj.series?.categories?.map((cat: any) => cat.name) || [],
  }))
  series: {
    id: string;
    title: string;
    slug: string;
    featuredImage: string;
    categories: string[];
  };

  @Expose()
  @Transform(({ obj }) => {
    // Get preview of content (first 200 characters)
    const content = obj.content || "";
    const preview = content.substring(0, 200).trim();
    // If content was truncated, add ellipsis
    return content.length > 200 ? preview + "..." : preview;
  })
  contentPreview: string;
}
