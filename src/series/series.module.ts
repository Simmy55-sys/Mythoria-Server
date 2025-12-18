import { Module } from "@nestjs/common";
import { SeriesService } from "./series.service";
import { SeriesController } from "./series.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Series } from "src/model/series.entity";
import { ChapterRead } from "src/model/chapter-read.entity";
import { Category } from "src/model/category.entity";
import { Chapter } from "src/model/chapter.entity";
import { Rating } from "src/model/rating.entity";
import { PurchasedChapter } from "src/model/purchased-chapter.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Series, ChapterRead, Category, Chapter, Rating, PurchasedChapter]),
  ],
  controllers: [SeriesController],
  providers: [SeriesService],
  exports: [SeriesService],
})
export class SeriesModule {}
