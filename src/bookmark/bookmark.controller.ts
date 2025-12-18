import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { BookmarkService } from "./bookmark.service";
import { Request } from "express";
import { IsAuthenticated } from "src/account/guard/is-authenticated.guard";

@Controller("bookmark")
export class BookmarkController {
  constructor(private readonly bookmarkService: BookmarkService) {}

  @Post("series/:seriesId")
  @UseGuards(IsAuthenticated)
  async bookmarkSeries(
    @Param("seriesId") seriesId: string,
    @Req() request: Request,
  ) {
    const { user } = request;
    return this.bookmarkService.bookmarkSeries(user?.id ?? "", seriesId);
  }

  @Delete("series/:seriesId")
  @UseGuards(IsAuthenticated)
  async removeBookmark(
    @Param("seriesId") seriesId: string,
    @Req() request: Request,
  ) {
    const { user } = request;
    return this.bookmarkService.removeBookmark(user?.id ?? "", seriesId);
  }

  @Get("series/:seriesId")
  @UseGuards(IsAuthenticated)
  async checkBookmark(
    @Param("seriesId") seriesId: string,
    @Req() request: Request,
  ) {
    const { user } = request;
    const isBookmarked = await this.bookmarkService.isBookmarked(
      user?.id ?? "",
      seriesId,
    );
    return { isBookmarked };
  }

  @Get("series")
  @UseGuards(IsAuthenticated)
  async getUserBookmarks(@Req() request: Request) {
    const { user } = request;
    return this.bookmarkService.getUserBookmarks(user?.id ?? "");
  }
}
