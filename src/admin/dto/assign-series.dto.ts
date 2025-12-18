import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class AssignSeriesToTranslator {
  @IsNotEmpty()
  seriesName: string;

  @IsNotEmpty()
  translatorId: string;

  @IsOptional()
  @IsNumber()
  adminRating?: number;
}
