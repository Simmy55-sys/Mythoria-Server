import {
  BadRequestException,
  Controller,
  Get,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ReadingProgressService } from "./reading-progress.service";
import { Request } from "express";
import { IsAuthenticated } from "src/account/guard/is-authenticated.guard";

@Controller("reading-progress")
export class ReadingProgressController {
  constructor(private readonly readingProgressService: ReadingProgressService) {}

  @Get("ongoing")
  @UseGuards(IsAuthenticated)
  async getOngoingSeries(@Req() request: Request) {
    const { user } = request;
    return this.readingProgressService.getOngoingSeries(user?.id ?? "");
  }

  @Get("series/:seriesId")
  @UseGuards(IsAuthenticated)
  async getLastReadChapter(
    @Param("seriesId") seriesId: string,
    @Req() request: Request,
  ) {
    const { user } = request;
    const lastChapterNumber =
      await this.readingProgressService.getLastReadChapter(
        user?.id ?? "",
        seriesId,
      );
    return { lastChapterNumber };
  }

  @Put("series/:seriesId")
  @UseGuards(IsAuthenticated)
  async setLastReadChapter(
    @Param("seriesId") seriesId: string,
    @Body() body: { chapterNumber: number },
    @Req() request: Request,
  ) {
    const { user } = request;
    const { chapterNumber } = body;
    if (typeof chapterNumber !== "number" || chapterNumber < 1) {
      throw new BadRequestException("Invalid chapter number");
    }
    return this.readingProgressService.setLastReadChapter(
      user?.id ?? "",
      seriesId,
      chapterNumber,
    );
  }
}
