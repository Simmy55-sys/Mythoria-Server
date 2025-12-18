import transformerFactory from "./factory";
import { Category } from "src/model/category.entity";
import { CategoryResponseDto } from "./dto/category-response.dto";

export function categoryResponseTransformer(category: Partial<Category>) {
  return transformerFactory(category, CategoryResponseDto);
}
