import { Module } from "@nestjs/common";
import { ChapterController } from "./chapter.controller";
import { ChapterService } from "./chapter.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Chapter } from "src/model/chapter.entity";
import { PurchasedChapter } from "src/model/purchased-chapter.entity";
import { ChapterRead } from "src/model/chapter-read.entity";
import { Series } from "src/model/series.entity";
import { User } from "src/model/user.entity";
import { FileReaderModule } from "src/file-reader/file-reader.module";
import { CloudinaryModule } from "src/cloudinary/cloudinary.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Chapter,
      PurchasedChapter,
      ChapterRead,
      Series,
      User,
    ]),
    FileReaderModule,
    CloudinaryModule,
  ],
  controllers: [ChapterController],
  providers: [ChapterService],
  exports: [ChapterService],
})
export class ChapterModule {}
