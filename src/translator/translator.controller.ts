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
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  InternalServerErrorException,
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
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { CreateBulkChaptersDto } from "src/chapter/dto/create-bulk-chapters.dto";
import { EntityManager } from "typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import events from "src/event";
import { Chapter } from "src/model/chapter.entity";

@Controller("translator")
export class TranslatorController {
  constructor(
    private readonly translatorService: TranslatorService,
    private readonly chapterService: ChapterService,
    private readonly manager: EntityManager,
    private readonly eventEmitter: EventEmitter2,
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
    const chapter = await this.chapterService.createChapter(
      seriesId,
      dto,
      chapterFile,
    );
    this.eventEmitter.emit(events.chapter.created, { chapter, seriesId });
    return chapterResponseTransformer(chapter);
  }

  @Post("series/chapter/:seriesId/bulk")
  @UseGuards(IsAuthenticated, IsTranslator, SeriesAssignmentGuard)
  @UseInterceptors(FilesInterceptor("chapterFiles", 100)) // Allow up to 100 files
  async createBulkChapters(
    @Param("seriesId") seriesId: string,
    @Body() dto: CreateBulkChaptersDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB per file
          new FileTypeValidator({
            fileType:
              /(application|text)\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|plain|markdown)/,
          }),
        ],
        fileIsRequired: false, // chapterFiles are optional (can use inbuilt editor or gdrive)
      }),
    )
    chapterFiles?: Express.Multer.File[],
  ) {
    return this.manager.transaction(async (transactionalEntity) => {
      if (!dto.chapters || dto.chapters.length === 0) {
        throw new BadRequestException("At least one chapter is required");
      }

      // Normalize chapterFiles to handle undefined or empty array
      const files = chapterFiles || [];

      // Count chapters that need files (no content and no fileUrl)
      const chaptersNeedingFiles = dto.chapters.filter(
        (chapter) => !chapter.content && !chapter.fileUrl,
      );

      // Validate file count matches chapters needing files
      if (files.length > 0 && files.length !== chaptersNeedingFiles.length) {
        throw new BadRequestException(
          `Number of files (${files.length}) does not match number of chapters requiring files (${chaptersNeedingFiles.length})`,
        );
      }

      // Process each chapter sequentially
      type BulkChapterResult =
        | { success: true; data: any }
        | {
            success: false;
            error: string;
            chapterNumber: number;
            title: string;
          };

      const results: BulkChapterResult[] = [];
      const createdChapters: Chapter[] = [];
      let fileIndex = 0;

      for (const chapterDto of dto.chapters) {
        // Determine if this chapter needs a file
        const needsFile = !chapterDto.content && !chapterDto.fileUrl;
        const chapterFile = needsFile ? files[fileIndex++] : undefined;

        try {
          const chapter = await this.chapterService.createChapter(
            seriesId,
            chapterDto,
            chapterFile,
            transactionalEntity,
          );
          createdChapters.push(chapter);
          results.push({
            success: true,
            data: chapterResponseTransformer(chapter),
          });
        } catch (error: any) {
          throw new InternalServerErrorException(
            error.message || "Failed to create chapter",
          );
        }
      }

      this.eventEmitter.emit(events.chapter.bulkCreated, {
        chapters: createdChapters,
        seriesId,
      });

      return {
        total: dto.chapters.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      };
    });
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

  @Post("upload-image")
  @UseGuards(IsAuthenticated, IsTranslator)
  @UseInterceptors(FileInterceptor("image"))
  async uploadImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(image)\/(jpeg|png|gif|webp)/ }),
        ],
      }),
    )
    image: Express.Multer.File,
  ) {
    const uploadResult = await this.translatorService.uploadImage(image);
    return { url: uploadResult.secure_url };
  }
}
