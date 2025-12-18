import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { ChapterService } from "./chapter.service";
import { Request, Response } from "express";
import { HandleIfAuthenticatedGuard } from "src/account/guard/handle-if-authenticated.guard";
import { IsAuthenticated } from "src/account/guard/is-authenticated.guard";
import { plainToInstance } from "class-transformer";
import { LatestChapterResponseDto } from "./dto/latest-chapter-response.dto";
import { getOrCreateSessionId } from "src/utils/session.util";

@Controller("chapter")
export class ChapterController {
  constructor(private readonly service: ChapterService) {}

  @Get("public/series/:seriesId/:id")
  @UseGuards(HandleIfAuthenticatedGuard)
  async publicChapter(
    @Param("seriesId") seriesId: string,
    @Param("id") id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = request.user?.id;
    const sessionId = userId ? undefined : getOrCreateSessionId(request);

    // Set session cookie for anonymous users (expires in 30 days)
    if (!userId && sessionId) {
      response.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    let purchased = false;

    if (userId) purchased = await this.service.hasPurchasedChapter(userId, id);

    return this.service.publicChapter(
      seriesId,
      id,
      purchased,
      userId,
      sessionId,
    );
  }

  @Get("public/latest")
  async getLatestChapters(@Query("limit") limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const chapters = await this.service.getLatestChapters(limitNum);

    return plainToInstance(LatestChapterResponseDto, chapters, {
      excludeExtraneousValues: true,
    });
  }

  @Get("public/series/:slug/chapter/:chapterNumber")
  @UseGuards(HandleIfAuthenticatedGuard)
  async getChapterBySlug(
    @Param("slug") slug: string,
    @Param("chapterNumber") chapterNumber: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const userId = request.user?.id;
    const sessionId = userId ? undefined : getOrCreateSessionId(request);

    // Set session cookie for anonymous users (expires in 30 days)
    if (!userId && sessionId) {
      response.cookie("sessionId", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });
    }

    const chapterNum = parseInt(chapterNumber, 10);
    if (isNaN(chapterNum)) {
      throw new BadRequestException("Invalid chapter number");
    }

    let purchased = false;

    if (userId) {
      // Get chapter ID first to check purchase status
      const chapterId = await this.service.getChapterIdBySlugAndNumber(
        slug,
        chapterNum,
      );

      if (chapterId) {
        purchased = await this.service.hasPurchasedChapter(userId, chapterId);
      }
    }

    return this.service.findBySlugAndChapterNumber(
      slug,
      chapterNum,
      purchased,
      userId,
      sessionId,
    );
  }

  @Post("purchase/:chapterId")
  @UseGuards(IsAuthenticated)
  async purchaseChapter(
    @Param("chapterId") chapterId: string,
    @Req() request: Request,
  ) {
    const { user } = request;
    return this.service.purchaseChapter(user?.id ?? "", chapterId);
  }
}
