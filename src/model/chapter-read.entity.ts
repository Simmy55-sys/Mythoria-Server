import { BaseEntity } from "src/interface/model/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Chapter } from "./chapter.entity";
import { User } from "./user.entity";

@Entity("chapter_reads")
@Index("IDX_chapter_reads_chapterId", ["chapterId"])
@Index("IDX_chapter_reads_userId", ["userId"])
@Index("IDX_chapter_reads_sessionId", ["sessionId"])
@Index("IDX_chapter_reads_readDate", ["readDate"])
export class ChapterRead extends BaseEntity {
  protected id_prefix = "crd";

  @Column({ name: "chapter_id" })
  chapterId: string;

  @Column({ name: "user_id", nullable: true })
  userId?: string; // For authenticated users

  @Column({ name: "session_id", nullable: true })
  sessionId?: string; // For anonymous users (cookie/localStorage/fingerprint)

  @Column({ name: "read_date", type: "date" })
  readDate: Date;

  @ManyToOne(() => Chapter, { onDelete: "CASCADE" })
  @JoinColumn({ name: "chapter_id" })
  chapter: Chapter;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user?: User;
}
