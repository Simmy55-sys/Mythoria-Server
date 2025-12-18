import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { CoinPurchase } from "src/model/coin-purchase.entity";
import { User } from "src/model/user.entity";
import { PayPalProvider } from "./providers/paypal.provider";

@Module({
  imports: [TypeOrmModule.forFeature([CoinPurchase, User])],
  controllers: [PaymentController],
  providers: [PaymentService, PayPalProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
