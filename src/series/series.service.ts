import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Series } from "src/model/series.entity";
import { ChapterRead } from "src/model/chapter-read.entity";
import { Category } from "src/model/category.entity";
import { Chapter } from "src/model/chapter.entity";
import { Rating } from "src/model/rating.entity";
import { PurchasedChapter } from "src/model/purchased-chapter.entity";
import {
  Repository,
  In,
  MoreThanOrEqual,
  ILike,
  LessThanOrEqual,
} from "typeorm";
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
    // Subquery to get the latest chapter publishDate for each series
    // Only consider chapters where publishDate is less than or equal to now
    const now = new Date();
    const seriesWithLatestChapter = await this.repo
      .createQueryBuilder("series")
      .leftJoin("series.chapters", "chapters")
      .select("series.id", "seriesId")
      .addSelect("MAX(chapters.publishDate)", "last_chapter_date")
      .where("series.isVisible = :isVisible", { isVisible: true })
      .andWhere("chapters.id IS NOT NULL")
      .andWhere("chapters.publishDate <= :now", { now })
      .groupBy("series.id")
      .orderBy("last_chapter_date", "DESC")
      .limit(limit)
      .getRawMany();

    const seriesIds = seriesWithLatestChapter.map((s) => s.seriesId);

    if (seriesIds.length === 0) {
      return [];
    }

    // Fetch full series data with chapters, preserving order
    const series = await this.repo.find({
      where: { id: In(seriesIds) },
      relations: ["chapters"],
    });

    // Create a map for quick lookup and preserve ordering
    const seriesMap = new Map(series.map((s) => [s.id, s]));
    const orderedSeries = seriesIds
      .map((id) => seriesMap.get(id))
      .filter((s): s is NonNullable<typeof s> => s !== undefined);

    // Filter out future-dated chapters and sort by publishDate (descending)
    orderedSeries.forEach((s) => {
      if (s.chapters) {
        // Filter out future-dated chapters
        s.chapters = s.chapters.filter((chapter) => chapter.publishDate <= now);
        // Sort by publish date (descending)
        s.chapters.sort(
          (a, b) =>
            b.chapterNumber -
            a.chapterNumber,
        );
      }
    });

    return orderedSeries;
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
    const now = new Date();
    const queryBuilder = this.repo
      .createQueryBuilder("series")
      .leftJoinAndSelect("series.categories", "categories")
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

    // Apply pagination (no chapters loaded - avoids loading full chapter content)
    const skip = (page - 1) * limit;
    const series = await queryBuilder
      .orderBy("series.createdAt", "DESC")
      .skip(skip)
      .take(limit)
      .getMany();

    // Fetch only recent 2 chapters per series (metadata only, no content)
    if (series.length > 0) {
      const seriesIds = series.map((s) => s.id);
      const rawRows = await this.chapterRepo.query(
        `SELECT id, series_id as "seriesId", chapter_number as "chapterNumber", is_premium as "isPremium", publish_date as "publishDate"
         FROM (
           SELECT *, ROW_NUMBER() OVER (PARTITION BY series_id ORDER BY publish_date DESC, created_at DESC) as rn
           FROM chapters
           WHERE series_id = ANY($1) AND publish_date <= $2 AND deleted_at IS NULL
         ) sub
         WHERE rn <= 2`,
        [seriesIds, now],
      );
      const bySeries = new Map<string, typeof rawRows>();
      for (const row of rawRows) {
        const list = bySeries.get(row.seriesId) ?? [];
        list.push(row);
        bySeries.set(row.seriesId, list);
      }
      series.forEach((s) => {
        s.chapters = bySeries.get(s.id) ?? [];
      });
    }

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
    const now = new Date();

    // Load series without chapters to avoid loading full chapter content
    const series = await this.repo.findOne({
      where: { slug, isVisible: true },
      relations: ["categories", "ratings", "bookmarks", "likes"],
    });

    if (!series) {
      throw new NotFoundException("Series not found");
    }

    // Total views from chapter read counts (single aggregate query, no chapter content)
    const totalViewsRow = await this.chapterRepo
      .createQueryBuilder("chapter")
      .select("COALESCE(SUM(chapter.readCount), 0)", "total")
      .where("chapter.seriesId = :seriesId", { seriesId: series.id })
      .andWhere("chapter.publishDate <= :now", { now })
      .getRawOne<{ total: string }>();
    (series as Series & { totalViews?: number }).totalViews = Number(
      totalViewsRow?.total ?? 0,
    );

    // Paginated chapters (select only list fields, exclude content to save memory)
    const skip = (page - 1) * limit;
    const [chapters, totalChapters] = await this.chapterRepo.findAndCount({
      where: {
        seriesId: series.id,
        publishDate: LessThanOrEqual(now),
      },
      select: [
        "id",
        "title",
        "chapterNumber",
        "isPremium",
        "publishDate",
        "priceInCoins",
      ],
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

  async rateSeries(seriesId: string, userId: string, rating: number) {
    // Verify series exists
    const series = await this.repo.findOne({ where: { id: seriesId } });
    if (!series) {
      throw new NotFoundException("Series not found");
    }

    // Check if user has already rated this series
    const existingRating = await this.ratingRepo.findOne({
      where: { seriesId, userId },
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      await this.ratingRepo.save(existingRating);
      return { message: "Rating updated successfully", rating: existingRating };
    }

    // Create new rating
    const newRating = this.ratingRepo.create({
      seriesId,
      userId,
      rating,
    });

    await this.ratingRepo.save(newRating);
    return { message: "Rating submitted successfully", rating: newRating };
  }

  async getUserRating(seriesId: string, userId: string) {
    const rating = await this.ratingRepo.findOne({
      where: { seriesId, userId },
    });

    return rating ? rating.rating : null;
  }
}
