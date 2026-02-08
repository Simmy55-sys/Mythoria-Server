import { Module } from "@nestjs/common";
import { TranslatorService } from "./translator.service";
import { TranslatorController } from "./translator.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TranslatorAssignment } from "src/model/series-translator-assignment.entity";
import { Series } from "src/model/series.entity";
import { Category } from "src/model/category.entity";
import { Chapter } from "src/model/chapter.entity";
import { PurchasedChapter } from "src/model/purchased-chapter.entity";
import { Comment } from "src/model/comment.entity";
import { Rating } from "src/model/rating.entity";
import { ChapterModule } from "src/chapter/chapter.module";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";
import { BotModule } from "src/bot/bot.module";
import { EventModule } from "src/event/event.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TranslatorAssignment,
      Series,
      Category,
      Chapter,
      PurchasedChapter,
      Comment,
      Rating,
    ]),
    ChapterModule,
    CloudinaryModule,
    BotModule,
    EventModule,
  ],
  providers: [TranslatorService],
  controllers: [TranslatorController],
})
export class TranslatorModule {}
