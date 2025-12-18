import { BaseEntity } from "src/interface/model/base.entity";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { Chapter } from "./chapter.entity";
import { User } from "./user.entity";

@Entity("purchased_chapters")
export class PurchasedChapter extends BaseEntity {
  protected id_prefix = "pch";

  @Column({ name: "chapter_id" })
  chapterId: string;

  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => User, (u) => u.purchasedChapters)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Chapter)
  @JoinColumn({ name: "chapter_id" })
  chapter: Chapter;

  @Column({ name: "purchase_date", type: "date" })
  purchaseDate: Date;
}
