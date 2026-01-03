import { BaseEntity } from "src/interface/model/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { User } from "./user.entity";
import { Series } from "./series.entity";

@Entity("likes")
@Unique(["userId", "seriesId"])
@Index("IDX_likes_userId", ["userId"])
@Index("IDX_likes_seriesId", ["seriesId"])
export class Like extends BaseEntity {
  protected id_prefix = "lik";

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "series_id" })
  seriesId: string;

  @Column({
    name: "liked_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  likedAt: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Series, (s) => s.likes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "series_id" })
  series: Series;
}
