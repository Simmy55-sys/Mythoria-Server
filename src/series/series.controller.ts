import { Controller, Get, Query, Param, Req, UseGuards } from "@nestjs/common";
import { SeriesService } from "./series.service";
import { plainToInstance } from "class-transformer";
import { LatestSeriesResponseDto } from "./dto/latest-series-response.dto";
import { PopularSeriesResponseDto } from "./dto/popular-series-response.dto";
import { AllSeriesResponseDto } from "./dto/all-series-response.dto";
import {
  SeriesDetailsResponseDto,
  SeriesDetailsChapterDto,
} from "./dto/series-details-response.dto";
import { HandleIfAuthenticatedGuard } from "src/account/guard/handle-if-authenticated.guard";
import { Request } from "express";

@Controller("series")
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  @Get("public/latest")
  async getLatestSeries(@Query("limit") limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 12;
    const series = await this.seriesService.getLatestSeries(limitNum);

    return plainToInstance(LatestSeriesResponseDto, series, {
      excludeExtraneousValues: true,
    });
  }

  @Get("public/popular-today")
  async getPopularTodaySeries(@Query("limit") limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 6;
    const series = await this.seriesService.getPopularTodaySeries(limitNum);

    return plainToInstance(PopularSeriesResponseDto, series, {
      excludeExtraneousValues: true,
    });
  }

  @Get("public/most-popular")
  async getMostPopularSeries(@Query("limit") limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 9;
    const series = await this.seriesService.getMostPopularSeries(limitNum);

    return plainToInstance(PopularSeriesResponseDto, series, {
      excludeExtraneousValues: true,
    });
  }

  @Get("public/all")
  async getAllSeries(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("novelType") novelType?: string,
    @Query("categories") categories?: string,
    @Query("search") search?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 24;

    const filters: {
      status?: string[];
      novelType?: string[];
      categories?: string[];
      search?: string;
    } = {};

    if (status) {
      filters.status = status.split(",");
    }

    if (novelType) {
      filters.novelType = novelType.split(",");
    }

    if (categories) {
      filters.categories = categories.split(",");
    }

    if (search) {
      filters.search = search.trim();
    }

    const result = await this.seriesService.getAllSeries(
      pageNum,
      limitNum,
      filters,
    );

    return {
      ...result,
      data: plainToInstance(AllSeriesResponseDto, result.data, {
        excludeExtraneousValues: true,
      }),
    };
  }

  @Get("public/:slug")
  @UseGuards(HandleIfAuthenticatedGuard)
  async getSeriesBySlug(
    @Param("slug") slug: string,
    @Req() request: Request,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const userId = request.user?.id;

    const result = await this.seriesService.getSeriesBySlug(
      slug,
      pageNum,
      limitNum,
      userId,
    );

    return {
      series: plainToInstance(SeriesDetailsResponseDto, result.series, {
        excludeExtraneousValues: true,
      }),
      chapters: plainToInstance(SeriesDetailsChapterDto, result.chapters, {
        excludeExtraneousValues: true,
      }),
      totalChapters: result.totalChapters,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
