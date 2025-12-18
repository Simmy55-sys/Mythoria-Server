import { IsNumber, IsPositive, Min } from "class-validator";

export class CreateCoinPurchaseDto {
  @IsNumber()
  @IsPositive()
  @Min(1)
  coinAmount: number;

  @IsNumber()
  @IsPositive()
  @Min(0.01)
  amountPaid: number;
}

