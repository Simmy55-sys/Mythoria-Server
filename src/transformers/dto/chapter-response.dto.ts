import { Expose } from "class-transformer";

export class ChapterResponseDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  content: string;

  @Expose()
  isPremium: boolean;

  @Expose()
  priceInCoins: number;

  @Expose()
  chapterNumber: number;

  @Expose()
  publishDate: Date;

  @Expose()
  language?: string;

  @Expose()
  fileUrl?: string;

  @Expose()
  readCount: number;
}
