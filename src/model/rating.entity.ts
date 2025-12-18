import { BaseEntity } from "src/interface/model/base.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./user.entity";
import { Series } from "./series.entity";

@Entity("ratings")
export class Rating extends BaseEntity {
  protected id_prefix = "rat";

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "series_id" })
  seriesId: string;

  @Column({ type: "int" })
  rating: number; // 1-5 stars

  @ManyToOne(() => User, (u) => u.ratings)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Series, (s) => s.ratings, { onDelete: "CASCADE" })
  @JoinColumn({ name: "series_id" })
  series: Series;
}
