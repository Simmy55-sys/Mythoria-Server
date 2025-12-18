import { Repository } from "typeorm";
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import BaseService from "src/interface/service/base.service";
import { Category } from "src/model/category.entity";
import { CreateCategoryDto } from "./dto/create-category.dto";

@Injectable()
export class CategoryService extends BaseService {
  constructor(
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {
    super();
  }

  async createCategory(dto: CreateCategoryDto) {
    const exists = await this.categoryRepo.findOne({
      where: { name: dto.name },
    });
    if (exists) throw new BadRequestException("Category already exists");

    const category = this.categoryRepo.create(dto);
    return this.categoryRepo.save(category);
  }

  async getCategories() {
    return this.categoryRepo.find({ order: { name: "ASC" } });
  }
}
