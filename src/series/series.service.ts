import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Series } from "src/model/series.entity";
import { ChapterRead } from "src/model/chapter-read.entity";
import { Category } from "src/model/category.entity";
import { Chapter } from "src/model/chapter.entity";
import { Rating } from "src/model/rating.entity";
import { PurchasedChapter } from "src/model/purchased-chapter.entity";
import { Repository, In, MoreThanOrEqual, ILike } from "typeorm";
import BaseService from "src/interface/service/base.service";

@Injectable()
export class SeriesService extends BaseService {
  constructor(
    @InjectRepository(Series)
    private readonly repo: Repository<Series>,
    @InjectRepository(ChapterRead)
    private readonly chapterReadRepo: Repository<ChapterRead>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Chapter)
    private readonly chapterRepo: Repository<Chapter>,
    @InjectRepository(Rating)
    private readonly ratingRepo: Repository<Rating>,
    @InjectRepository(PurchasedChapter)
    private readonly purchasedChapterRepo: Repository<PurchasedChapter>,
  ) {
    super();
  }

  async getLatestSeries(limit: number = 12) {
    // Get series that have chapters, ordered by the most recent chapter publish date
    const seriesWithChapters = await this.repo
      .createQueryBuilder("series")
      .leftJoin("series.chapters", "chapters")
      .addSelect("MAX(chapters.publishDate)", "last_chapter_date")
      .where("series.isVisible = :isVisible", { isVisible: true })
      .andWhere("chapters.id IS NOT NULL") // Only series with chapters
      .groupBy("series.id")
      .orderBy("last_chapter_date", "DESC")
      .addOrderBy("series.createdAt", "DESC")
      .take(limit)
      .getMany();

    // Get series IDs
    const seriesIds = seriesWithChapters.map((s) => s.id);

    if (seriesIds.length === 0) {
      return [];
    }

    // Now fetch series with their chapters
    const series = await this.repo.find({
      where: { id: In(seriesIds) },
      relations: ["chapters"],
    });

    // Sort chapters within each series by publish date (descending)
    series.forEach((s) => {
      if (s.chapters) {
        s.chapters.sort((a, b) => {
          const dateA = new Date(a.publishDate).getTime();
          const dateB = new Date(b.publishDate).getTime();
          return dateB - dateA; // Descending order
        });
      }
    });

    // Sort series by their most recent chapter publish date
    series.sort((a, b) => {
      const aLatest = a.chapters?.[0]?.publishDate
        ? new Date(a.chapters[0].publishDate).getTime()
        : 0;
      const bLatest = b.chapters?.[0]?.publishDate
        ? new Date(b.chapters[0].publishDate).getTime()
        : 0;
      return bLatest - aLatest;
    });

    return series;
  }

  async getPopularTodaySeries(limit: number = 6) {
    // Get series with most reads in the last 24 hours using aggregate counters
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Get read counts per series for the last 24 hours from chapter_reads
    // Then aggregate by series
    const readsBySeries = await this.chapterReadRepo
      .createQueryBuilder("read")
      .leftJoin("read.chapter", "chapter")
      .leftJoin("chapter.series", "series")
      .select("series.id", "seriesId")
      .addSelect("COUNT(DISTINCT read.id)", "read_count")
      .where("read.readDate >= :yesterday", { yesterday })
      .andWhere("series.isVisible = :isVisible", { isVisible: true })
      .groupBy("series.id")
      .orderBy("read_count", "DESC")
      .limit(limit)
      .getRawMany();

    const seriesIds = readsBySeries.map((r) => r.seriesId);

    if (seriesIds.length === 0) {
      return [];
    }

    // Fetch series with their categories
    const series = await this.repo.find({
      where: { id: In(seriesIds) },
      relations: ["categories"],
    });

    // Sort by read count order
    const seriesMap = new Map(series.map((s) => [s.id, s]));
    return readsBySeries
      .map((r) => seriesMap.get(r.seriesId))
      .filter((s) => s !== undefined) as Series[];
  }

  async getMostPopularSeries(limit: number = 9) {
    // Get series with most total reads using aggregate counters from chapters table
    // Sum readCount from all chapters in each series
    const seriesWithReadCounts = await this.repo
      .createQueryBuilder("series")
      .leftJoin("series.chapters", "chapter")
      .select("series.id", "id")
      .addSelect("SUM(chapter.readCount)", "total_read_count")
      .where("series.isVisible = :isVisible", { isVisible: true })
      .groupBy("series.id")
      .having("SUM(chapter.readCount) > 0")
      .orderBy("total_read_count", "DESC")
      .limit(limit)
      .getRawMany();

    const seriesIds = seriesWithReadCounts.map((r) => r.id);

    if (seriesIds.length === 0) {
      return [];
    }

    // Fetch series with their categories
    const series = await this.repo.find({
      where: { id: In(seriesIds) },
      relations: ["categories"],
    });

    // Sort by read count order
    const seriesMap = new Map(series.map((s) => [s.id, s]));
    return seriesWithReadCounts
      .map((r) => seriesMap.get(r.id))
      .filter((s) => s !== undefined) as Series[];
  }

  async getAllSeries(
    page: number = 1,
    limit: number = 24,
    filters?: {
      status?: string[];
      novelType?: string[];
      categories?: string[];
      search?: string;
    },
  ) {
    const queryBuilder = this.repo
      .createQueryBuilder("series")
      .leftJoinAndSelect("series.categories", "categories")
      .leftJoinAndSelect("series.chapters", "chapters")
      .leftJoinAndSelect("series.ratings", "ratings")
      .where("series.isVisible = :isVisible", { isVisible: true });

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      queryBuilder.andWhere("series.status IN (:...statuses)", {
        statuses: filters.status,
      });
    }

    if (filters?.novelType && filters.novelType.length > 0) {
      queryBuilder.andWhere("series.novelType IN (:...types)", {
        types: filters.novelType,
      });
    }

    if (filters?.categories && filters.categories.length > 0) {
      // Find category IDs from names
      const categories = await this.categoryRepo.find({
        where: { name: In(filters.categories) },
      });
      const categoryIds = categories.map((c) => c.id);

      if (categoryIds.length > 0) {
        queryBuilder
          .innerJoin("series.categories", "filterCategories")
          .andWhere("filterCategories.id IN (:...categoryIds)", {
            categoryIds,
          });
      }
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        "(series.title ILIKE :search OR series.author ILIKE :search OR series.description ILIKE :search)",
        { search: `%${filters.search}%` },
      );
    }

    // Get total count before pagination
    const total = await queryBuilder.getCount();

    // Apply pagination
    const skip = (page - 1) * limit;
    const series = await queryBuilder
      .orderBy("series.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getMany();

    // Sort chapters within each series by publish date (descending)
    series.forEach((s) => {
      if (s.chapters) {
        s.chapters.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Descending order
        });
      }
    });

    return {
      data: series,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSeriesBySlug(
    slug: string,
    page: number = 1,
    limit: number = 20,
    userId?: string,
  ) {
    // Get series with relations
    const series = await this.repo.findOne({
      where: { slug, isVisible: true },
      relations: ["categories", "ratings"],
    });

    if (!series) {
      throw new NotFoundException("Series not found");
    }

    // Get paginated chapters
    const skip = (page - 1) * limit;
    const [chapters, totalChapters] = await this.chapterRepo.findAndCount({
      where: { seriesId: series.id },
      order: { chapterNumber: "DESC" },
      skip,
      take: limit,
    });

    // Check purchase status for chapters if user is authenticated
    if (userId && chapters.length > 0) {
      const chapterIds = chapters.map((c) => c.id);
      const purchasedChapters = await this.purchasedChapterRepo.find({
        where: {
          userId,
          chapterId: In(chapterIds),
        },
      });

      const purchasedChapterIds = new Set(
        purchasedChapters.map((pc) => pc.chapterId),
      );

      // Mark purchased chapters as non-premium
      chapters.forEach((chapter) => {
        if (purchasedChapterIds.has(chapter.id)) {
          chapter.isPremium = false;
        }
      });
    }

    return {
      series: {
        ...series,
        totalChapters,
      },
      chapters,
      totalChapters,
      page,
      limit,
      totalPages: Math.ceil(totalChapters / limit),
    };
  }
}
