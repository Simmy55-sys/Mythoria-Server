import { BaseEntity } from "src/interface/model/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { User } from "./user.entity";
import { Series } from "./series.entity";

@Entity("user_chapter_read")
@Unique(["userId", "seriesId", "chapterNumber"])
@Index("IDX_user_chapter_read_user_series", ["userId", "seriesId"])
export class UserChapterRead extends BaseEntity {
  protected id_prefix = "ucr";

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "series_id" })
  seriesId: string;

  @Column({ type: "int", name: "chapter_number" })
  chapterNumber: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Series, { onDelete: "CASCADE" })
  @JoinColumn({ name: "series_id" })
  series: Series;
}
