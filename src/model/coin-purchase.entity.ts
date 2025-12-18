import { BaseEntity } from "src/interface/model/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { User } from "./user.entity";
import { PaymentProviderProcessorType } from "src/interface/payment/types";

@Entity("coin_purchases")
@Index("IDX_coin_purchases_userId", ["userId"])
@Index("IDX_coin_purchases_paymentId", ["paymentId"])
export class CoinPurchase extends BaseEntity {
  protected id_prefix = "cpr";

  @Column({ name: "user_id" })
  userId: string;

  @Column({ type: "int", name: "coin_amount" })
  coinAmount: number;

  @Column({ type: "decimal", precision: 10, scale: 2, name: "amount_paid" })
  amountPaid: number;

  @Column({
    type: "enum",
    enum: PaymentProviderProcessorType,
    name: "payment_provider",
  })
  paymentProvider: PaymentProviderProcessorType;

  @Column({ name: "payment_id", nullable: true })
  paymentId?: string;

  @Column({ name: "order_id", nullable: true })
  orderId?: string;

  @Column({
    type: "enum",
    enum: ["pending", "completed", "failed", "cancelled"],
    default: "pending",
    name: "status",
  })
  status: "pending" | "completed" | "failed" | "cancelled";

  @Column({
    name: "purchase_date",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  purchaseDate: Date;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;
}
