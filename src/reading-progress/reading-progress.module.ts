import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ReadingProgress } from "src/model/reading-progress.entity";
import { UserChapterRead } from "src/model/user-chapter-read.entity";
import { Series } from "src/model/series.entity";
import { Chapter } from "src/model/chapter.entity";
import { ReadingProgressService } from "./reading-progress.service";
import { ReadingProgressController } from "./reading-progress.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReadingProgress,
      UserChapterRead,
      Series,
      Chapter,
    ]),
  ],
  providers: [ReadingProgressService],
  controllers: [ReadingProgressController],
  exports: [ReadingProgressService],
})
export class ReadingProgressModule {}
