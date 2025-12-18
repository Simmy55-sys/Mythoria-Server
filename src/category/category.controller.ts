import { Controller, Get } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { categoryResponseTransformer } from "src/transformers/category.transformer";

@Controller("category")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async getCategories() {
    const categories = await this.categoryService.getCategories();
    return categories.map((category) => category.name);
  }
}
