import { Body, Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
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
    return userResponseTransformer(
      await this.adminService.createTranslator(_body),
    );
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
}
