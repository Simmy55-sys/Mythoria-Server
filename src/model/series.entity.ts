import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  Unique,
} from "typeorm";
import { Category } from "./category.entity";
import { Chapter } from "./chapter.entity";
import { TranslatorAssignment } from "./series-translator-assignment.entity";
import { Comment } from "./comment.entity";
import { Rating } from "./rating.entity";
import { Bookmark } from "./bookmark.entity";
import { SoftDeletableEntity } from "src/interface/model/soft-deletable.entity";

@Entity("series")
@Index("slug_deleted_at_unique", ["slug", "deletedAt"])
@Unique(["slug", "deletedAt"])
export class Series extends SoftDeletableEntity {
  protected id_prefix = "srs";

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ name: "translator_name" })
  translatorName: string; // captured from the translator user creating it

  @Column("text")
  description: string;

  @Column({ default: true, name: "is_visible" })
  isVisible: boolean; // visible to readers after admin review

  @Column({ default: "ongoing" })
  status: "ongoing" | "completed";

  @Column()
  slug: string;

  @Column({ default: "novel", name: "novel_type" })
  novelType: "novel" | "manga" | "manhwa";

  @Column({ name: "original_language" })
  originalLanguage: string;

  @Column({ nullable: true, name: "featured_image" })
  featuredImage: string;

  @Column({ name: "assignment_id" })
  assignmentId: string; // foreign key to the translator assignment

  @ManyToMany(() => Category, (category) => category.series, { eager: true })
  @JoinTable({ name: "series_categories" })
  categories: Category[];

  @OneToMany(() => Chapter, (c) => c.series)
  chapters: Chapter[];

  @OneToOne(() => TranslatorAssignment, (a) => a.series)
  @JoinColumn({ name: "assignment_id" })
  translatorAssignments: TranslatorAssignment;

  @OneToMany(() => Comment, (c) => c.series)
  comments: Comment[];

  @OneToMany(() => Rating, (r) => r.series)
  ratings: Rating[];

  @OneToMany(() => Bookmark, (b) => b.series)
  bookmarks: Bookmark[];
}
