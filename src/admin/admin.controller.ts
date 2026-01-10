import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { CreateTranslatorDto } from "src/user/dto/create-user.dto";
import { userResponseTransformer } from "src/transformers/user.transformer";
import { IsAuthenticated } from "src/account/guard/is-authenticated.guard";
import { IsAdmin } from "src/account/guard/roles/is-admin.guard";
import { AssignSeriesToTranslator } from "./dto/assign-series.dto";
import { CategoryService } from "src/category/category.service";
import { CreateCategoryDto } from "src/category/dto/create-category.dto";
import { categoryResponseTransformer } from "src/transformers/category.transformer";

@Controller("admin")
@UseGuards(IsAuthenticated, IsAdmin)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly categoryService: CategoryService,
  ) {}

  @Post("create-translator")
  async createTranslator(@Body() _body: CreateTranslatorDto) {
    const result = await this.adminService.createTranslator(_body);
    const transformedUser = userResponseTransformer(result);
    // Include password in response for admin to share with translator
    return {
      ...transformedUser,
      password: result.password,
    };
  }

  @Post("assign-series")
  @HttpCode(200)
  async assignSeries(@Body() _body: AssignSeriesToTranslator) {
    const assignment = await this.adminService.assignSeriesToTranslator(
      _body.translatorId,
      {
        name: _body.seriesName,
        rating: _body.adminRating?.toString(),
      },
    );

    return {
      message:
        "Series assigned to translator successfully. Translator can now start translating the series using the assignment ID.",
      assignmentId: assignment.assignmentId,
    };
  }

  @Post("create-category")
  async createCategory(@Body() _body: CreateCategoryDto) {
    return categoryResponseTransformer(
      await this.categoryService.createCategory(_body),
    );
  }

  @Get("translators")
  async getTranslators() {
    return await this.adminService.getTranslators();
  }

  @Get("series")
  async getSeries() {
    return await this.adminService.getSeries();
  }

  @Patch("translators/:id/toggle-status")
  @HttpCode(200)
  async toggleTranslatorStatus(@Param("id") id: string) {
    return await this.adminService.toggleTranslatorStatus(id);
  }

  @Delete("translators/:id")
  @HttpCode(200)
  async deleteTranslator(@Param("id") id: string) {
    return await this.adminService.deleteTranslator(id);
  }

  @Delete("series/:id")
  @HttpCode(200)
  async deleteSeries(@Param("id") id: string) {
    return await this.adminService.deleteSeries(id);
  }

  @Get("series/:id/chapters")
  async getSeriesChapters(@Param("id") id: string) {
    return await this.adminService.getSeriesChapters(id);
  }

  @Get("chapters/:id")
  async getChapterContent(@Param("id") id: string) {
    return await this.adminService.getChapterContent(id);
  }

  @Patch("chapters/:id/toggle-premium")
  @HttpCode(200)
  async toggleChapterPremium(@Param("id") id: string) {
    return await this.adminService.toggleChapterPremium(id);
  }

  @Delete("chapters/:id")
  @HttpCode(200)
  async deleteChapter(@Param("id") id: string) {
    return await this.adminService.deleteChapter(id);
  }

  @Get("statistics")
  async getStatistics() {
    return await this.adminService.getStatistics();
  }

  @Get("recent-purchases")
  async getRecentPurchases(@Query("limit") limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return await this.adminService.getRecentPurchasedChapters(limitNum);
  }

  @Get("recent-coin-purchases")
  async getRecentCoinPurchases(@Query("limit") limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return await this.adminService.getRecentCoinPurchases(limitNum);
  }
}
