import { Module } from "@nestjs/common";
import { BookmarkService } from "./bookmark.service";
import { BookmarkController } from "./bookmark.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Bookmark } from "src/model/bookmark.entity";
import { Series } from "src/model/series.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Bookmark, Series])],
  providers: [BookmarkService],
  controllers: [BookmarkController],
  exports: [BookmarkService],
})
export class BookmarkModule {}

