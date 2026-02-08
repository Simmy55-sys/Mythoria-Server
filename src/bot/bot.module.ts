import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BotService } from "./bot.service";
import { Series } from "src/model/series.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Series])],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
