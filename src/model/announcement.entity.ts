import { Entity, Column } from "typeorm";
import { BaseEntity } from "src/interface/model/base.entity";
import { resolveDbType } from "src/utils/db-parse-column";

@Entity("announcements")
export class Announcement extends BaseEntity {
  protected id_prefix = "ann";

  @Column()
  title: string;

  @Column("text")
  content: string;

  @Column({
    type: "enum",
    enum: ["info", "warning", "success", "error"],
    default: "info",
  })
  type: "info" | "warning" | "success" | "error";

  @Column({ default: true, name: "is_active" })
  isActive: boolean;

  @Column({
    type: resolveDbType("timestamptz"),
    name: "start_date",
  })
  startDate: Date;

  @Column({
    type: resolveDbType("timestamptz"),
    nullable: true,
    name: "end_date",
  })
  endDate: Date | null;
}

