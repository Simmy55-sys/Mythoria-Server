import { Module } from "@nestjs/common";
import { CommentController } from "./comment.controller";
import { CommentService } from "./comment.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Comment } from "src/model/comment.entity";
import { Series } from "src/model/series.entity";
import { Chapter } from "src/model/chapter.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Comment, Series, Chapter])],
  controllers: [CommentController],
  providers: [CommentService],
  exports: [CommentService],
})
export class CommentModule {}
