import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import BaseService from "src/interface/service/base.service";
import { TranslatorAssignment } from "src/model/series-translator-assignment.entity";
import {
  EntityManager,
  In,
  Repository,
  MoreThanOrEqual,
  Or,
  IsNull,
} from "typeorm";
import { Series } from "src/model/series.entity";
import { CreateSeriesDto } from "./dto/create-series.dto";
import { Category } from "src/model/category.entity";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { PurchasedChapter } from "src/model/purchased-chapter.entity";
import { Chapter } from "src/model/chapter.entity";
import { Comment } from "src/model/comment.entity";
import { Rating } from "src/model/rating.entity";

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

    return savedSeries;
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
    const assignments = await this.assignmentRepo.find({
      where: { translatorId, isSeriesCreated: true },
      relations: ["series", "series.chapters", "series.ratings"],
    });

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
          rating: averageRating,
        };
      });
  }

  async getSeriesById(seriesId: string, translatorId: string) {
    // Get the series with all relations
    const series = await this.seriesRepo.findOne({
      where: { id: seriesId },
      relations: ["categories", "chapters"],
    });

    if (!series) throw new NotFoundException("Series not found");

    return series;
  }

  async getDashboardStats(translatorId: string) {
    // Get all series assigned to this translator
    const assignments = await this.assignmentRepo.find({
      where: { translatorId, isSeriesCreated: true },
      relations: ["series", "series.chapters"],
    });

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

    // Get all chapters for these series
    const chapters = await this.chapterRepo.find({
      where: { seriesId: In(seriesIds) },
      select: ["id", "priceInCoins"],
    });

    const chapterIds = chapters.map((c) => c.id);

    // Calculate date 6 months ago
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get purchases in the last 6 months for chapters belonging to this translator's series
    const recentPurchases = await this.purchasedChapterRepo.find({
      where: {
        chapterId: In(chapterIds),
        purchaseDate: MoreThanOrEqual(sixMonthsAgo),
      },
      relations: ["chapter"],
    });

    // Calculate revenue (sum of chapter prices from the chapter relation)
    const revenue = recentPurchases.reduce((sum, purchase) => {
      const priceInCoins = purchase.chapter?.priceInCoins || 0;
      return sum + priceInCoins;
    }, 0);

    // Convert coins to dollars (assuming 1 coin = $0.01, adjust as needed)
    const revenueInDollars = revenue * 0.01;

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
    // Get all series assigned to this translator
    const assignments = await this.assignmentRepo.find({
      where: { translatorId, isSeriesCreated: true },
      relations: ["series"],
    });

    const seriesIds = assignments
      .filter((a) => a.series)
      .map((a) => a.series.id);

    if (seriesIds.length === 0) {
      return [];
    }

    // Get all chapters for these series with their series info
    const chapters = await this.chapterRepo.find({
      where: { seriesId: In(seriesIds) },
      select: ["id", "title", "chapterNumber", "priceInCoins", "seriesId"],
      relations: ["series"],
    });

    const chapterIds = chapters.map((c) => c.id);

    if (chapterIds.length === 0) {
      return [];
    }

    // Get purchase counts for each chapter
    const purchaseCounts = await this.purchasedChapterRepo
      .createQueryBuilder("purchase")
      .select("purchase.chapterId", "chapterId")
      .addSelect("COUNT(purchase.id)", "purchaseCount")
      .where("purchase.chapterId IN (:...chapterIds)", { chapterIds })
      .groupBy("purchase.chapterId")
      .getRawMany();

    // Create a map of chapterId -> purchaseCount
    const purchaseCountMap = new Map<string, number>();
    purchaseCounts.forEach((pc) => {
      purchaseCountMap.set(pc.chapterId, parseInt(pc.purchaseCount, 10));
    });

    // Calculate revenue for each chapter (purchaseCount * priceInCoins)
    const chaptersWithStats = chapters.map((chapter) => {
      const purchaseCount = purchaseCountMap.get(chapter.id) || 0;
      const revenueInCoins = purchaseCount * (chapter.priceInCoins || 0);
      const revenueInDollars = revenueInCoins * 0.01;

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
    // Get all series assigned to this translator
    const assignments = await this.assignmentRepo.find({
      where: { translatorId, isSeriesCreated: true },
      relations: ["series"],
    });

    const seriesIds = assignments
      .filter((a) => a.series)
      .map((a) => a.series.id);

    if (seriesIds.length === 0) {
      return [];
    }

    // Get all chapters for these series
    const chapters = await this.chapterRepo.find({
      where: { seriesId: In(seriesIds) },
      select: ["id"],
    });

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
      const priceInCoins = purchase.chapter?.priceInCoins || 0;
      const revenueInDollars = priceInCoins * 0.01;

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
    // Get all series assigned to this translator
    const assignments = await this.assignmentRepo.find({
      where: { translatorId, isSeriesCreated: true },
      relations: ["series"],
    });

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

    // Get all purchases for these chapters
    const allPurchases = await this.purchasedChapterRepo.find({
      where: {
        chapterId: In(chapterIds),
      },
      relations: ["chapter"],
    });

    // Calculate revenue for each purchase
    const purchasesWithRevenue = allPurchases.map((purchase) => {
      const priceInCoins = purchase.chapter?.priceInCoins || 0;
      const revenueInDollars = priceInCoins * 0.01;
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
}
