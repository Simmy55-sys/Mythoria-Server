import { BaseEntity } from "src/interface/model/base.entity";
import { Entity, Column, ManyToMany } from "typeorm";
import { Series } from "./series.entity";

@Entity("category")
export class Category extends BaseEntity {
  protected id_prefix = "cat";

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => Series, (series) => series.categories)
  series: Series[];
}
