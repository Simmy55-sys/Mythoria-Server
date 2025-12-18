import { BaseEntity } from "src/interface/model/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { User } from "./user.entity";
import { Series } from "./series.entity";

@Entity("bookmarks")
@Unique(["userId", "seriesId"])
@Index("IDX_bookmarks_userId", ["userId"])
@Index("IDX_bookmarks_seriesId", ["seriesId"])
export class Bookmark extends BaseEntity {
  protected id_prefix = "bmk";

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "series_id" })
  seriesId: string;

  @Column({
    name: "bookmarked_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  bookmarkedAt: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Series, (s) => s.bookmarks, { onDelete: "CASCADE" })
  @JoinColumn({ name: "series_id" })
  series: Series;
}
