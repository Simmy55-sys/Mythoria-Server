import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { Request } from "express";
import { CreateSeriesDto } from "./dto/create-series.dto";
import { UpdateSeriesDto } from "./dto/update-series.dto";
import { TranslatorService } from "./translator.service";
import { IsAuthenticated } from "src/account/guard/is-authenticated.guard";
import { IsTranslator } from "src/account/guard/roles/is-translator.guard";
import { seriesResponseTransformer } from "src/transformers/series.transformer";
import { SeriesAssignmentGuard } from "src/account/guard/series-assignment.guard";
import { CreateChapterDto } from "src/chapter/dto/create-chapter.dto";
import { UpdateChapterDto } from "src/chapter/dto/update-chapter.dto";
import { ChapterService } from "src/chapter/chapter.service";
import { chapterResponseTransformer } from "src/transformers/chapter.transformer";
import { FileInterceptor } from "@nestjs/platform-express";

@Controller("translator")
export class TranslatorController {
  constructor(
    private readonly translatorService: TranslatorService,
    private readonly chapterService: ChapterService,
  ) {}

  @Get("assignment/:assignmentId")
  @UseGuards(IsAuthenticated, IsTranslator)
  async getAssignment(
    @Param("assignmentId") assignmentId: string,
    @Req() request: Request,
  ) {
    const { user } = request;
    return this.translatorService.getAssignmentByAssignmentId(
      assignmentId,
      user?.id ?? "",
    );
  }

  @Get("series")
  @UseGuards(IsAuthenticated, IsTranslator)
  async getTranslatorSeries(@Req() request: Request) {
    const { user } = request;
    const series = await this.translatorService.getTranslatorSeries(
      user?.id ?? "",
    );
    // Return series directly since it's already in the correct format
    return series;
  }

  @Get("series/:seriesId")
  @UseGuards(IsAuthenticated, IsTranslator, SeriesAssignmentGuard)
  async getSeriesById(
    @Param("seriesId") seriesId: string,
    @Req() request: Request,
  ) {
    const { user } = request;
    const series = await this.translatorService.getSeriesById(
      seriesId,
      user?.id ?? "",
    );
    return seriesResponseTransformer(series);
  }

  @Post("series/create")
  @UseGuards(IsAuthenticated, IsTranslator)
  @UseInterceptors(FileInterceptor("featuredImage"))
  async createSeries(
    @Body() _body: CreateSeriesDto,
    @Req() request: Request,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({
            fileType: /(image|video|application)\/(.*)/,
          }),
        ],
        fileIsRequired: false, // featuredImage is optional
      }),
    )
    featuredImage?: Express.Multer.File,
  ) {
    const { user } = request;
    return seriesResponseTransformer(
      await this.translatorService.createSeries(
        _body,
        user?.id ?? "",
        featuredImage,
      ),
    );
  }

  @Patch("series/:seriesId")
  @UseGuards(IsAuthenticated, IsTranslator, SeriesAssignmentGuard)
  @UseInterceptors(FileInterceptor("featuredImage"))
  async updateSeries(
    @Param("seriesId") seriesId: string,
    @Body() dto: UpdateSeriesDto,
    @Req() request: Request,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({
            fileType: /(image|video|application)\/(.*)/,
          }),
        ],
        fileIsRequired: false, // featuredImage is optional
      }),
    )
    featuredImage?: Express.Multer.File,
  ) {
    const { user } = request;
    return seriesResponseTransformer(
      await this.translatorService.updateSeries(
        seriesId,
        user?.id ?? "",
        dto,
        featuredImage,
      ),
    );
  }

  @Post("series/chapter/:seriesId")
  @UseGuards(IsAuthenticated, IsTranslator, SeriesAssignmentGuard)
  @UseInterceptors(FileInterceptor("chapterFile"))
  async createChapter(
    @Param("seriesId") seriesId: string,
    @Body() dto: CreateChapterDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({
            fileType:
              /(application|text)\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|plain|markdown)/,
          }),
        ],
        fileIsRequired: false, // chapterFile is optional (can use inbuilt editor or gdrive)
      }),
    )
    chapterFile?: Express.Multer.File,
  ) {
    return chapterResponseTransformer(
      await this.chapterService.createChapter(seriesId, dto, chapterFile),
    );
  }

  @Get("series/chapter/:seriesId")
  async findAllChaptersBySeries(@Param("seriesId") seriesId: string) {
    const chapters = await this.chapterService.findBySeries(seriesId);

    return chapters.map(chapterResponseTransformer);
  }

  @Get("series/chapter/:seriesId/:id")
  async findOneChapter(
    @Param("seriesId") seriesId: string,
    @Param("id") id: string,
  ) {
    return chapterResponseTransformer(
      await this.chapterService.findOne(seriesId, id),
    );
  }

  @Patch("series/chapter/:seriesId/:id")
  @UseGuards(IsAuthenticated, IsTranslator, SeriesAssignmentGuard)
  async updateChapter(
    @Param("seriesId") seriesId: string,
    @Param("id") id: string,
    @Body() dto: UpdateChapterDto,
  ) {
    return chapterResponseTransformer(
      await this.chapterService.updateChapter(seriesId, id, dto),
    );
  }

  @Delete("series/chapter/:seriesId/:id")
  @UseGuards(IsAuthenticated, IsTranslator, SeriesAssignmentGuard)
  deleteChapter(@Param("seriesId") seriesId: string, @Param("id") id: string) {
    return this.chapterService.deleteChapter(seriesId, id);
  }

  @Get("dashboard/stats")
  @UseGuards(IsAuthenticated, IsTranslator)
  async getDashboardStats(@Req() request: Request) {
    const { user } = request;
    return this.translatorService.getDashboardStats(user?.id ?? "");
  }

  @Get("dashboard/popular-chapters")
  @UseGuards(IsAuthenticated, IsTranslator)
  async getMostPopularChapters(@Req() request: Request) {
    const { user } = request;
    return this.translatorService.getMostPopularChapters(user?.id ?? "", 4);
  }

  @Get("dashboard/recent-purchases")
  @UseGuards(IsAuthenticated, IsTranslator)
  async getRecentPurchases(@Req() request: Request) {
    const { user } = request;
    return this.translatorService.getRecentPurchases(user?.id ?? "", 20);
  }

  @Get("dashboard/earnings")
  @UseGuards(IsAuthenticated, IsTranslator)
  async getEarningsData(@Req() request: Request) {
    const { user } = request;
    const year = request.query.year
      ? parseInt(request.query.year as string, 10)
      : undefined;
    return this.translatorService.getEarningsData(user?.id ?? "", year);
  }
}
