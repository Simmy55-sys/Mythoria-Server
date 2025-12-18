import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Series } from "./series.entity";
import { BaseEntity } from "src/interface/model/base.entity";
import { Comment } from "./comment.entity";
import { resolveDbType } from "src/utils/db-parse-column";

@Entity("chapters")
export class Chapter extends BaseEntity {
  protected id_prefix = "chp";

  @Column({ name: "series_id" })
  seriesId: string;

  @Column()
  title: string;

  @Column("text")
  content: string;

  @Column({ default: true, name: "is_premium" })
  isPremium: boolean;

  @Column({
    type: resolveDbType("timestamptz"),
    name: "publish_date",
    default: new Date(),
  })
  publishDate: Date;

  @Column({ name: "language" })
  language: string;

  @Column({ type: "int", nullable: true, name: "price_in_coins", default: 20 })
  priceInCoins?: number;

  @Column({ name: "chapter_number" })
  chapterNumber: number;

  @Column({ name: "notes", type: "text", nullable: true })
  notes?: string;

  @Column({ name: "file_url", nullable: true })
  fileUrl?: string; // URL to the original file in Cloudinary

  @Column({ name: "read_count", type: "bigint", default: 0 })
  readCount: number; // Aggregate counter for performance

  @ManyToOne(() => Series, (s) => s.chapters, {
    onDelete: "CASCADE",
    eager: true,
  })
  @JoinColumn({ name: "series_id" })
  series: Series;

  @OneToMany(() => Comment, (c) => c.chapter)
  comments: Comment[];
}
