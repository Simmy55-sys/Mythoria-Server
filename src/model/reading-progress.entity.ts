import { BaseEntity } from "src/interface/model/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { User } from "./user.entity";
import { Series } from "./series.entity";

@Entity("reading_progress")
@Unique(["userId", "seriesId"])
@Index("IDX_reading_progress_userId", ["userId"])
@Index("IDX_reading_progress_seriesId", ["seriesId"])
export class ReadingProgress extends BaseEntity {
  protected id_prefix = "rdp";

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "series_id" })
  seriesId: string;

  @Column({ type: "int", name: "last_chapter_number" })
  lastChapterNumber: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Series, { onDelete: "CASCADE" })
  @JoinColumn({ name: "series_id" })
  series: Series;
}
