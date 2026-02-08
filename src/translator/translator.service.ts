import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EventEmitter2 } from "@nestjs/event-emitter";
import BaseService from "src/interface/service/base.service";
import { TranslatorAssignment } from "src/model/series-translator-assignment.entity";
import { EntityManager, In, Repository } from "typeorm";
import { Series } from "src/model/series.entity";
import { CreateSeriesDto } from "./dto/create-series.dto";
import { UpdateSeriesDto } from "./dto/update-series.dto";
import { Category } from "src/model/category.entity";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { PurchasedChapter } from "src/model/purchased-chapter.entity";
import { Chapter } from "src/model/chapter.entity";
import { Comment } from "src/model/comment.entity";
import { Rating } from "src/model/rating.entity";
import events from "src/event";
import { BotService } from "src/bot/bot.service";

@Injectable()
export class TranslatorService extends BaseService {
  constructor(
    @InjectRepository(TranslatorAssignment)
    private assignmentRepo: Repository<TranslatorAssignment>,
    @InjectRepository(Series)
    private seriesRepo: Repository<Series>,
    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
    @InjectRepository(PurchasedChapter)
    private purchasedChapterRepo: Repository<PurchasedChapter>,
    @InjectRepository(Chapter)
    private chapterRepo: Repository<Chapter>,
    @InjectRepository(Comment)
    private commentRepo: Repository<Comment>,
    @InjectRepository(Rating)
    private ratingRepo: Repository<Rating>,
    private cloudinaryService: CloudinaryService,
    private eventEmitter: EventEmitter2,
    private botService: BotService,
  ) {
    super();
  }

  async createSeries(
    dto: CreateSeriesDto,
    translatorId: string,
    featuredImage?: Express.Multer.File,
    transactionalEntity?: EntityManager,
  ) {
    const assignment = await this.assignmentRepo.findOne({
      where: { assignmentId: dto.assignmentId, translatorId },
      relations: ["translator"],
    });

    if (!assignment) throw new NotFoundException("Assignment not found");
    if (assignment.isSeriesCreated)
      throw new BadRequestException(
        "You have already created a series for this assignment",
      );

    // Categories have a many to many relationship with series so we need to ensure the categories exists
    for (const category of dto.categories.split(",")) {
      const existingCategory = await this.categoryRepo.findOne({
        where: { name: category },
      });

      if (!existingCategory)
        throw new NotFoundException(`Category ${category} not found`);
    }

    if (featuredImage) {
      const uploadResult = await this.cloudinaryService.uploadFile(
        featuredImage,
        "series/featured-images/" + assignment.seriesName,
      );
      if (!uploadResult)
        throw new BadRequestException("Failed to upload featured image");
      dto.featuredImage = uploadResult.secure_url;
    }

    // Add categories to series
    const categories = await this.categoryRepo.find({
      where: { name: In(dto.categories.split(",")) },
    });

    // Create series
    const series = this.seriesRepo.create({
      title: assignment.seriesName,
      author: dto.author,
      translatorName: assignment.translator.username,
      description: dto.description ?? "",
      categories,
      status: dto.status,
      novelType: dto.novelType,
      originalLanguage: dto.originalLanguage,
      featuredImage: dto.featuredImage,
      isVisible: true, // (Admin review not required for translator created series)
      assignmentId: assignment.id,
      slug: dto.slug,
    });

    const savedSeries = await this.performEntityOps<Series, Series>({
      repositoryManager: this.seriesRepo,
      transactionalEntity: transactionalEntity,
      action: "save",
      opsArgs: [series],
    });

    assignment.isSeriesCreated = true;
    await this.performEntityOps<TranslatorAssignment, TranslatorAssignment>({
      repositoryManager: this.assignmentRepo,
      transactionalEntity: transactionalEntity,
      action: "update",
      opsArgs: [
        TranslatorAssignment,
        { id: assignment.id },
        { isSeriesCreated: true },
      ],
    });

    // Emit event to create a text channel for the series
    this.eventEmitter.emit(events.series.created, {
      series: savedSeries,
      channelIds: {
        general: this.botService.getConfig().generalChannel,
      },
      translator: assignment.translator.username,
    });

    return savedSeries;
  }

  async updateSeries(
    seriesId: string,
    translatorId: string,
    dto: UpdateSeriesDto,
    featuredImage?: Express.Multer.File,
    transactionalEntity?: EntityManager,
  ) {
    // Verify the series belongs to this translator, including soft-deleted
    const assignment = await this.assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.series", "series")
      .where("assignment.translatorId = :translatorId", { translatorId })
      .andWhere("assignment.isSeriesCreated = :isSeriesCreated", {
        isSeriesCreated: true,
      })
      .andWhere("series.id = :seriesId", { seriesId })
      .withDeleted() // Include soft-deleted series
      .getOne();

    if (!assignment || !assignment.series) {
      throw new NotFoundException(
        "Series not found or you don't have permission to edit it",
      );
    }

    const series = await this.seriesRepo.findOne({
      where: { id: seriesId },
      relations: ["categories"],
    });

    if (!series) {
      throw new NotFoundException("Series not found");
    }

    // Handle featured image upload if provided
    if (featuredImage) {
      const uploadResult = await this.cloudinaryService.uploadFile(
        featuredImage,
        "series/featured-images/" + series.title,
      );
      if (!uploadResult)
        throw new BadRequestException("Failed to upload featured image");
      dto.featuredImage = uploadResult.secure_url;
    }

    // Handle categories update if provided
    if (dto.categories) {
      // Validate categories exist
      for (const category of dto.categories.split(",")) {
        const existingCategory = await this.categoryRepo.findOne({
          where: { name: category.trim() },
        });

        if (!existingCategory)
          throw new NotFoundException(`Category ${category} not found`);
      }

      // Update categories
      const categories = await this.categoryRepo.find({
        where: { name: In(dto.categories.split(",").map((c) => c.trim())) },
      });
      series.categories = categories;
    }

    // Update other fields
    if (dto.description !== undefined) series.description = dto.description;
    if (dto.slug !== undefined) series.slug = dto.slug;
    if (dto.author !== undefined) series.author = dto.author;
    if (dto.status !== undefined) series.status = dto.status;
    if (dto.novelType !== undefined) series.novelType = dto.novelType;
    if (dto.originalLanguage !== undefined)
      series.originalLanguage = dto.originalLanguage;
    if (dto.featuredImage !== undefined)
      series.featuredImage = dto.featuredImage;

    return this.performEntityOps<Series, Series>({
      repositoryManager: this.seriesRepo,
      transactionalEntity,
      action: "save",
      opsArgs: [series],
    });
  }

  async getAssignmentByAssignmentId(
    assignmentId: string,
    translatorId: string,
  ) {
    const assignment = await this.assignmentRepo.findOne({
      where: { assignmentId, translatorId },
      relations: ["translator"],
    });

    if (!assignment) throw new NotFoundException("Assignment not found");
    if (assignment.isSeriesCreated)
      throw new BadRequestException(
        "Series has already been created for this assignment",
      );

    return {
      assignmentId: assignment.assignmentId,
      seriesName: assignment.seriesName,
      translatorId: assignment.translatorId,
    };
  }

  async getTranslatorSeries(translatorId: string) {
    // Get all assignments for this translator where series has been created
    // Use QueryBuilder to include soft-deleted series and chapters
    const assignments = await this.assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.series", "series")
      .leftJoinAndSelect("series.chapters", "chapters")
      .leftJoinAndSelect("series.categories", "categories")
      .leftJoinAndSelect(
        "series.translatorAssignments",
        "translatorAssignments",
      )
      .where("assignment.translatorId = :translatorId", { translatorId })
      .andWhere("assignment.isSeriesCreated = :isSeriesCreated", {
        isSeriesCreated: true,
      })
      .withDeleted() // Include soft-deleted series and chapters
      .getMany();

    // Map to series with chapter count, views, and rating
    return assignments
      .filter((assignment) => assignment.series)
      .map((assignment) => {
        const series = assignment.series;
        const chapters = series.chapters || [];

        // Calculate total views (sum of all chapter readCount)
        const views = chapters.reduce(
          (sum, chapter) => sum + Number(chapter.readCount || 0),
          0,
        );

        // Calculate average rating
        const ratings = series.ratings || [];
        let averageRating = 0;
        if (ratings.length > 0) {
          const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
          averageRating = Math.round((totalRating / ratings.length) * 10) / 10; // Round to 1 decimal place
        }

        return {
          id: series.id,
          title: series.title,
          author: series.author,
          featuredImage: series.featuredImage,
          novelType: series.novelType,
          slug: series.slug,
          status: series.status,
          chapters: chapters.length,
          views,
          rating: averageRating || 4.0,
        };
      });
  }

  async getSeriesById(seriesId: string, translatorId: string) {
    // Get the series with all relations, including soft-deleted
    const series = await this.seriesRepo
      .createQueryBuilder("series")
      .leftJoinAndSelect("series.categories", "categories")
      .leftJoinAndSelect("series.chapters", "chapters")
      .where("series.id = :seriesId", { seriesId })
      .withDeleted() // Include soft-deleted series and chapters
      .getOne();

    if (!series) throw new NotFoundException("Series not found");

    return series;
  }

  async getDashboardStats(translatorId: string) {
    // Get all series assigned to this translator, including soft-deleted
    const assignments = await this.assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.series", "series")
      .leftJoinAndSelect("series.chapters", "chapters")
      .where("assignment.translatorId = :translatorId", { translatorId })
      .andWhere("assignment.isSeriesCreated = :isSeriesCreated", {
        isSeriesCreated: true,
      })
      .withDeleted() // Include soft-deleted series and chapters
      .getMany();

    const seriesIds = assignments
      .filter((a) => a.series)
      .map((a) => a.series.id);

    if (seriesIds.length === 0) {
      return {
        seriesPublished: 0,
        totalChapters: 0,
        revenue: 0,
        chapterSales: 0,
        comments: 0,
        averageRating: 0,
      };
    }

    // Get all chapters for these series, including soft-deleted
    const chapters = await this.chapterRepo
      .createQueryBuilder("chapter")
      .where("chapter.seriesId IN (:...seriesIds)", { seriesIds })
      .select(["chapter.id", "chapter.priceInCoins"])
      .withDeleted() // Include soft-deleted chapters
      .getMany();

    const chapterIds = chapters.map((c) => c.id);

    // Calculate date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get purchases in the last 6 months for chapters belonging to this translator's series, including soft-deleted
    const recentPurchases = await this.purchasedChapterRepo
      .createQueryBuilder("purchase")
      .leftJoinAndSelect("purchase.chapter", "chapter")
      .where("purchase.chapterId IN (:...chapterIds)", { chapterIds })
      .andWhere("purchase.purchaseDate >= :sixMonthsAgo", { sixMonthsAgo })
      .withDeleted() // Include soft-deleted chapters
      .getMany();

    // Calculate revenue (sum of chapter prices from the chapter relation)
    const revenue = recentPurchases.reduce((sum, purchase) => {
      const priceInCoins = purchase.price || 0;
      return sum + priceInCoins;
    }, 0);

    // Convert coins to dollars (assuming 1 coin = $0.01, adjust as needed)
    const revenueInDollars = revenue * 0.05;

    // Get comment count for translator's series or chapters (only approved comments)
    // Comments can be on series OR chapters, so we need to count both
    const seriesCommentCount = await this.commentRepo.count({
      where: {
        seriesId: In(seriesIds),
        status: "approved",
      },
    });

    const chapterCommentCount = await this.commentRepo.count({
      where: {
        chapterId: In(chapterIds),
        status: "approved",
      },
    });

    const commentCount = seriesCommentCount + chapterCommentCount;

    // Calculate average rating for translator's series
    const ratings = await this.ratingRepo.find({
      where: {
        seriesId: In(seriesIds),
      },
      select: ["rating"],
    });

    let averageRating = 0;
    if (ratings.length > 0) {
      const totalRating = ratings.reduce((sum, r) => sum + r.rating, 0);
      averageRating = totalRating / ratings.length;
    }

    return {
      seriesPublished: seriesIds.length,
      totalChapters: chapters.length,
      revenue: Math.round(revenueInDollars * 100) / 100, // Round to 2 decimal places
      chapterSales: recentPurchases.length,
      comments: commentCount,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
    };
  }

  async getMostPopularChapters(translatorId: string, limit: number = 4) {
    // Get all series assigned to this translator, including soft-deleted
    const assignments = await this.assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.series", "series")
      .where("assignment.translatorId = :translatorId", { translatorId })
      .andWhere("assignment.isSeriesCreated = :isSeriesCreated", {
        isSeriesCreated: true,
      })
      .withDeleted() // Include soft-deleted series
      .getMany();

    const seriesIds = assignments
      .filter((a) => a.series)
      .map((a) => a.series.id);

    if (seriesIds.length === 0) {
      return [];
    }

    // Get all chapters for these series with their series info, including soft-deleted
    const chapters = await this.chapterRepo
      .createQueryBuilder("chapter")
      .leftJoinAndSelect("chapter.series", "series")
      .where("chapter.seriesId IN (:...seriesIds)", { seriesIds })
      .select([
        "chapter.id",
        "chapter.title",
        "chapter.chapterNumber",
        "chapter.priceInCoins",
        "chapter.seriesId",
      ])
      .withDeleted() // Include soft-deleted chapters
      .getMany();

    const chapterIds = chapters.map((c) => c.id);

    if (chapterIds.length === 0) {
      return [];
    }

    // Get purchase counts and total revenue for each chapter using actual purchase prices
    const purchaseStats = await this.purchasedChapterRepo
      .createQueryBuilder("purchase")
      .select("purchase.chapterId", "chapterId")
      .addSelect("COUNT(purchase.id)", "purchaseCount")
      .addSelect("SUM(purchase.price)", "totalRevenueInCoins")
      .where("purchase.chapterId IN (:...chapterIds)", { chapterIds })
      .groupBy("purchase.chapterId")
      .getRawMany();

    // Create maps of chapterId -> purchaseCount and totalRevenue
    const purchaseCountMap = new Map<string, number>();
    const revenueMap = new Map<string, number>();
    purchaseStats.forEach((ps) => {
      purchaseCountMap.set(ps.chapterId, parseInt(ps.purchaseCount, 10));
      revenueMap.set(ps.chapterId, parseFloat(ps.totalRevenueInCoins || 0));
    });

    // Calculate revenue for each chapter using actual purchase prices
    const chaptersWithStats = chapters.map((chapter) => {
      const purchaseCount = purchaseCountMap.get(chapter.id) || 0;
      const revenueInCoins = revenueMap.get(chapter.id) || 0;
      const revenueInDollars = revenueInCoins * 0.05;

      return {
        id: chapter.id,
        title: chapter.title,
        chapterNumber: chapter.chapterNumber,
        seriesTitle: chapter.series?.title || "Unknown Series",
        purchaseCount,
        revenue: Math.round(revenueInDollars * 100) / 100,
      };
    });

    // Sort by purchase count (descending) and return top N
    return chaptersWithStats
      .sort((a, b) => b.purchaseCount - a.purchaseCount)
      .slice(0, limit);
  }

  async getRecentPurchases(translatorId: string, limit: number = 20) {
    // Get all series assigned to this translator, including soft-deleted
    const assignments = await this.assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.series", "series")
      .where("assignment.translatorId = :translatorId", { translatorId })
      .andWhere("assignment.isSeriesCreated = :isSeriesCreated", {
        isSeriesCreated: true,
      })
      .withDeleted() // Include soft-deleted series
      .getMany();

    const seriesIds = assignments
      .filter((a) => a.series)
      .map((a) => a.series.id);

    if (seriesIds.length === 0) {
      return [];
    }

    // Get all chapters for these series, including soft-deleted
    const chapters = await this.chapterRepo
      .createQueryBuilder("chapter")
      .where("chapter.seriesId IN (:...seriesIds)", { seriesIds })
      .select(["chapter.id"])
      .withDeleted() // Include soft-deleted chapters
      .getMany();

    const chapterIds = chapters.map((c) => c.id);

    if (chapterIds.length === 0) {
      return [];
    }

    // Get recent purchases with relations
    const purchases = await this.purchasedChapterRepo.find({
      where: {
        chapterId: In(chapterIds),
      },
      relations: ["user", "chapter", "chapter.series"],
      order: {
        purchaseDate: "DESC",
        createdAt: "DESC",
      },
      take: limit,
    });

    // Transform to response format
    return purchases.map((purchase) => {
      // Use the price stored at purchase time, not the current chapter price
      const priceInCoins = purchase.price || 0;
      const revenueInDollars = priceInCoins * 0.05;

      return {
        id: purchase.id,
        purchaseDate: purchase.purchaseDate,
        createdAt: purchase.createdAt,
        chapterTitle: purchase.chapter?.title || "Unknown Chapter",
        chapterNumber: purchase.chapter?.chapterNumber || 0,
        chapterId: purchase.chapterId,
        seriesTitle: purchase.chapter?.series?.title || "Unknown Series",
        seriesId: purchase.chapter?.seriesId || "",
        buyerUsername: purchase.user?.username || "Unknown User",
        revenue: Math.round(revenueInDollars * 100) / 100,
      };
    });
  }

  async getEarningsData(translatorId: string, year?: number) {
    // Get all series assigned to this translator, including soft-deleted
    const assignments = await this.assignmentRepo
      .createQueryBuilder("assignment")
      .leftJoinAndSelect("assignment.series", "series")
      .where("assignment.translatorId = :translatorId", { translatorId })
      .andWhere("assignment.isSeriesCreated = :isSeriesCreated", {
        isSeriesCreated: true,
      })
      .withDeleted() // Include soft-deleted series
      .getMany();

    const seriesIds = assignments
      .filter((a) => a.series)
      .map((a) => a.series.id);

    if (seriesIds.length === 0) {
      return {
        monthlyData: [],
        lastMonthEarnings: 0,
        thisWeekEarnings: 0,
        lastWeekEarnings: 0,
        totalEarnings: 0,
      };
    }

    // Get all chapters for these series
    const chapters = await this.chapterRepo.find({
      where: { seriesId: In(seriesIds) },
      select: ["id", "priceInCoins"],
    });

    const chapterIds = chapters.map((c) => c.id);

    if (chapterIds.length === 0) {
      return {
        monthlyData: [],
        lastMonthEarnings: 0,
        thisWeekEarnings: 0,
        lastWeekEarnings: 0,
        totalEarnings: 0,
      };
    }

    // Get all purchases for these chapters, including soft-deleted
    const allPurchases = await this.purchasedChapterRepo
      .createQueryBuilder("purchase")
      .leftJoinAndSelect("purchase.chapter", "chapter")
      .where("purchase.chapterId IN (:...chapterIds)", { chapterIds })
      .withDeleted() // Include soft-deleted chapters
      .getMany();

    // Calculate revenue for each purchase using the price stored at purchase time
    const purchasesWithRevenue = allPurchases.map((purchase) => {
      const priceInCoins = purchase.price || 0;
      const revenueInDollars = priceInCoins * 0.05;
      return {
        ...purchase,
        revenue: revenueInDollars,
      };
    });

    // Group by month for the specified year (or current year)
    const targetYear = year || new Date().getFullYear();
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthlyData = monthNames.map((monthName, index) => {
      const monthPurchases = purchasesWithRevenue.filter((p) => {
        const purchaseDate = new Date(p.purchaseDate);
        return (
          purchaseDate.getFullYear() === targetYear &&
          purchaseDate.getMonth() === index
        );
      });

      const totalRevenue = monthPurchases.reduce(
        (sum, p) => sum + p.revenue,
        0,
      );

      return {
        month: monthName,
        earned: Math.round(totalRevenue * 100) / 100,
      };
    });

    // Calculate last month earnings
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthPurchases = purchasesWithRevenue.filter((p) => {
      const purchaseDate = new Date(p.purchaseDate);
      return (
        purchaseDate.getFullYear() === lastMonth.getFullYear() &&
        purchaseDate.getMonth() === lastMonth.getMonth()
      );
    });
    const lastMonthEarnings = lastMonthPurchases.reduce(
      (sum, p) => sum + p.revenue,
      0,
    );

    // Calculate this week earnings
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
    thisWeekStart.setHours(0, 0, 0, 0);

    const thisWeekPurchases = purchasesWithRevenue.filter((p) => {
      const purchaseDate = new Date(p.purchaseDate);
      return purchaseDate >= thisWeekStart;
    });
    const thisWeekEarnings = thisWeekPurchases.reduce(
      (sum, p) => sum + p.revenue,
      0,
    );

    // Calculate last week earnings
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);

    const lastWeekPurchases = purchasesWithRevenue.filter((p) => {
      const purchaseDate = new Date(p.purchaseDate);
      return purchaseDate >= lastWeekStart && purchaseDate < lastWeekEnd;
    });
    const lastWeekEarnings = lastWeekPurchases.reduce(
      (sum, p) => sum + p.revenue,
      0,
    );

    // Calculate total earnings (all time)
    const totalEarnings = purchasesWithRevenue.reduce(
      (sum, p) => sum + p.revenue,
      0,
    );

    return {
      monthlyData,
      lastMonthEarnings: Math.round(lastMonthEarnings * 100) / 100,
      thisWeekEarnings: Math.round(thisWeekEarnings * 100) / 100,
      lastWeekEarnings: Math.round(lastWeekEarnings * 100) / 100,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
    };
  }

  async uploadImage(file: Express.Multer.File) {
    const uploadResult = await this.cloudinaryService.uploadFile(
      file,
      "chapter-images",
    );
    if (!uploadResult) {
      throw new BadRequestException("Failed to upload image");
    }
    return uploadResult;
  }
}
