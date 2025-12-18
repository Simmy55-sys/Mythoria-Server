import { SeriesResponseDto } from "./dto/series-response.dto";
import transformerFactory from "./factory";
import { Series } from "src/model/series.entity";

export function seriesResponseTransformer(series: Partial<Series>) {
  return transformerFactory(series, SeriesResponseDto);
}
