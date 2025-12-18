import { Expose, Transform } from "class-transformer";

export class PublicChapterDto {
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
  language: string;

  @Expose()
  priceInCoins: number;

  @Expose()
  @Transform(({ obj }) => {
    // If free → content visible
    if (!obj.notes) return null;

    // Premium → no notes visible unless explicitly passed as purchased
    if (!obj.isPremium) return obj.content;
    return undefined;
  })
  notes: string | null;

  @Expose()
  @Transform(({ obj }) => {
    // If free → content visible
    if (!obj.isPremium) return obj.content;

    // Premium → content hidden unless explicitly passed as purchased
    return undefined;
  })
  content?: string;
}
