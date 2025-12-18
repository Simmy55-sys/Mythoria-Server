import { BaseEntity } from "src/interface/model/base.entity";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { User } from "./user.entity";
import { Series } from "./series.entity";
import { Chapter } from "./chapter.entity";

@Entity("comments")
export class Comment extends BaseEntity {
  protected id_prefix = "cmt";

  @Column({ name: "user_id" })
  userId: string;

  @Column({ name: "series_id", nullable: true })
  seriesId?: string; // Nullable if comment is on a chapter

  @Column({ name: "chapter_id", nullable: true })
  chapterId?: string; // Nullable if comment is on a series

  @Column({ name: "parent_comment_id", nullable: true })
  parentCommentId?: string; // For nested/reply comments

  @Column("text")
  content: string;

  @Column({ default: "approved", name: "status" })
  status: "approved" | "rejected"; // Auto-approve by default

  @ManyToOne(() => User, (u) => u.comments)
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Series, (s) => s.comments, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "series_id" })
  series?: Series;

  @ManyToOne(() => Chapter, (c) => c.comments, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "chapter_id" })
  chapter?: Chapter;

  @ManyToOne(() => Comment, (c) => c.replies, {
    nullable: true,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "parent_comment_id" })
  parentComment?: Comment;

  @OneToMany(() => Comment, (c) => c.parentComment)
  replies: Comment[];
}
