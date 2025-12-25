import {
  Column,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  Unique,
} from "typeorm";
import { SoftDeletableEntity } from "src/interface/model/soft-deletable.entity";
import { Role } from "src/global/enum";
import { TranslatorAssignment } from "./series-translator-assignment.entity";
import { PurchasedChapter } from "./purchased-chapter.entity";
import { Comment } from "./comment.entity";
import { Rating } from "./rating.entity";
import { Bookmark } from "./bookmark.entity";

@Entity("user")
@Index("email_role_deleted_at_unique", ["email", "role", "deletedAt"])
@Unique(["email", "role", "deletedAt"])
export class User extends SoftDeletableEntity {
  protected id_prefix = "usr";

  @Column()
  username: string;

  @Column()
  email: string;

  @Column()
  password: string; // store hashed password

  @Column({ type: "enum", enum: Role, default: Role.READER })
  role: Role;

  @Column({ type: "int", default: 50, name: "coin_balance" })
  coinBalance: number;

  @OneToMany(() => TranslatorAssignment, (t) => t.translator)
  seriesAssignments: TranslatorAssignment[];

  @OneToMany(() => PurchasedChapter, (p) => p.user)
  purchasedChapters: PurchasedChapter[];

  @OneToMany(() => Comment, (c) => c.user)
  comments: Comment[];

  @OneToMany(() => Rating, (r) => r.user)
  ratings: Rating[];

  @OneToMany(() => Bookmark, (b) => b.user)
  bookmarks: Bookmark[];
}
