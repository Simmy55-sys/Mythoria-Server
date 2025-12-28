import { IsInt, IsNotEmpty, Min, Max } from "class-validator";

export class RateSeriesDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  @Max(5)
  rating: number;
}
