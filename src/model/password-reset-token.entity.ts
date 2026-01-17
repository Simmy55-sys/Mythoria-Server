import { BaseEntity } from "src/interface/model/base.entity";
import { Column, Entity, ManyToOne, JoinColumn, Index } from "typeorm";
import { User } from "./user.entity";
import { resolveDbType } from "src/utils/db-parse-column";

@Entity("password_reset_tokens")
@Index("IDX_password_reset_tokens_token", ["token"])
@Index("IDX_password_reset_tokens_userId", ["userId"])
export class PasswordResetToken extends BaseEntity {
  protected id_prefix = "prt";

  @Column({ name: "user_id" })
  userId: string;

  @Column({ unique: true })
  token: string;

  @Column({
    type: resolveDbType("timestamptz"),
    name: "expires_at",
  })
  expiresAt: Date;

  @Column({ default: false, name: "is_used" })
  isUsed: boolean;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
