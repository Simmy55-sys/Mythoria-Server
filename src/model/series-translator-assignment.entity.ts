import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { BaseEntity } from "src/interface/model/base.entity";
import { User } from "./user.entity";
import { Series } from "./series.entity";

@Entity("translator_assignments")
export class TranslatorAssignment extends BaseEntity {
  protected id_prefix = "tas";

  @Column({ name: "series_name" })
  seriesName: string;

  @Column({ unique: true, name: "assignment_id" })
  assignmentId: string;

  @Column({ name: "translator_id" })
  translatorId: string;

  @Column({ default: false, name: "is_series_created" })
  isSeriesCreated: boolean; // prevents creating twice

  @ManyToOne(() => User, (u) => u.seriesAssignments, { eager: true })
  @JoinColumn({ name: "translator_id" })
  translator: User;

  @OneToOne(() => Series, (s) => s.translatorAssignments, { eager: true })
  series: Series;

  @Column({ type: "int", default: 3 })
  adminRating: number;
}
