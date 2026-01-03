import { Module } from "@nestjs/common";
import { LikeService } from "./like.service";
import { LikeController } from "./like.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Like } from "src/model/like.entity";
import { Series } from "src/model/series.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Like, Series])],
  providers: [LikeService],
  controllers: [LikeController],
  exports: [LikeService],
})
export class LikeModule {}

