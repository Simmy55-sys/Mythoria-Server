import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import BaseService from "src/interface/service/base.service";
import { UserService } from "src/user/user.service";
import { EntityManager, Repository, IsNull, Not, In } from "typeorm";
import { Role } from "src/global/enum";
import { generatePassword } from "src/utils/password-generator";
import { EmailService } from "src/email/email.service";
import { TranslatorAssignment } from "src/model/series-translator-assignment.entity";
import { AccountService } from "src/account/account.service";
import { ulid } from "ulid";
import { Series } from "src/model/series.entity";
import { Chapter } from "src/model/chapter.entity";
import { User } from "src/model/user.entity";
import { CoinPurchase } from "src/model/coin-purchase.entity";
import { PurchasedChapter } from "src/model/purchased-chapter.entity";
import { EventEmitter2 } from "@nestjs/event-emitter";
import events from "src/event";

@Injectable()
export class AdminService extends BaseService {
  constructor(
    private userService: UserService,
    private accountService: AccountService,
    private emailService: EmailService,
    private eventEmitter: EventEmitter2,
    @InjectRepository(TranslatorAssignment)
    private translatorAssignmentRepo: Repository<TranslatorAssignment>,
    @InjectRepository(Series)
    private seriesRepo: Repository<Series>,
    @InjectRepository(Chapter)
    private chapterRepo: Repository<Chapter>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(CoinPurchase)
    private coinPurchaseRepo: Repository<CoinPurchase>,
    @InjectRepository(PurchasedChapter)
    private purchasedChapterRepo: Repository<PurchasedChapter>,
  ) {
    super();
  }

  async createTranslator(
    createUserDto: Omit<CreateUserDto, "password" | "role">,
    transactionalEntity?: EntityManager,
  ) {
    const generatedPassword = generatePassword();
    const translator = await this.accountService.registerTranslator(
      { ...createUserDto, password: generatedPassword },
      transactionalEntity,
    );

    await this.emailService.sendAccountCreatedByAdmin({
      username: translator.username,
      email: translator.email,
      password: translator.password ?? "",
    });

    // Return translator with password for admin to share
    return {
      ...translator,
      password: generatedPassword,
    };
  }

  async assignSeriesToTranslator(
    translatorId: string,
    opt: {
      name: string;
      rating?: string;
    },
  ) {
    const translator = await this.userService.findOne({
      where: { id: translatorId, role: Role.TRANSLATOR },
    });
    if (!translator)
      throw new NotFoundException("Translator with this ID not found");

    // Assign the series to the translator and give the series its name and maybe a rating
    return this.translatorAssignmentRepo.save(
      this.translatorAssignmentRepo.create({
        translatorId,
        seriesName: opt.name,
        adminRating: opt.rating ? parseInt(opt.rating) : undefined,
        assignmentId: ulid(),
      }),
    );
  }

  async getTranslators() {
    const translators = await this.userService.findMany({
      where: { role: Role.TRANSLATOR },
      relations: ["seriesAssignments"],
    });

    // Get statistics for each translator
    const translatorsWithStats = await Promise.all(
      translators.map(async (translator) => {
        const assignments = await this.translatorAssignmentRepo.find({
          where: { translatorId: translator.id },
          relations: ["series"],
        });

        // Get series IDs from assignments that have been created
        const seriesIds = assignments
          .filter((a) => a.isSeriesCreated && a.series)
          .map((a) => a.series.id);

        let chaptersTranslated = 0;
        if (seriesIds.length > 0) {
          const chapters = await this.chapterRepo.find({
            where: { seriesId: In(seriesIds) },
          });
          chaptersTranslated = chapters.length;
        }

        return {
          id: translator.id,
          username: translator.username,
          email: translator.email,
          status: translator.deletedAt ? "suspended" : "active",
          assignedSeries: assignments.length,
          chaptersTranslated,
          joinedDate: translator.createdAt.toISOString().split("T")[0],
        };
      }),
    );

    return translatorsWithStats;
  }

  async getSeries(
    page: number = 1,
    limit: number = 10,
    filters?: {
      search?: string;
      status?: string[];
      translator?: string;
    },
  ) {
    const queryBuilder = this.seriesRepo
      .createQueryBuilder("series")
      .leftJoinAndSelect("series.categories", "categories");

    // Apply search filter
    if (filters?.search) {
      queryBuilder.andWhere("series.title ILIKE :search", {
        search: `%${filters.search}%`,
      });
    }

    // Apply status filter
    if (filters?.status && filters.status.length > 0) {
      queryBuilder.andWhere("series.status IN (:...statuses)", {
        statuses: filters.status,
      });
    }

    // Apply translator filter
    if (filters?.translator) {
      // First, find translator assignments that match the translator username
      const translatorUsers = await this.userRepo.find({
        where: {
          username: filters.translator,
          role: Role.TRANSLATOR,
        },
      });

      if (translatorUsers.length > 0) {
        const translatorIds = translatorUsers.map((u) => u.id);
        const matchingAssignments = await this.translatorAssignmentRepo.find({
          where: { translator: { id: In(translatorIds) } },
        });
        const assignmentIds = matchingAssignments.map((a) => a.id);

        if (assignmentIds.length > 0) {
          queryBuilder.andWhere("series.assignmentId IN (:...assignmentIds)", {
            assignmentIds,
          });
        } else {
          // No matching assignments, return empty result
          queryBuilder.andWhere("1 = 0");
        }
      } else {
        // No matching translator, return empty result
        queryBuilder.andWhere("1 = 0");
      }
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

    // Get assignments separately to get translator info
    const assignmentIds = series.map((s) => s.assignmentId).filter(Boolean);
    const assignments =
      assignmentIds.length > 0
        ? await this.translatorAssignmentRepo.find({
            where: { id: In(assignmentIds) },
            relations: ["translator"],
          })
        : [];

    const assignmentMap = new Map(assignments.map((a) => [a.id, a]));

    // Get chapter counts per series (no full chapter entities loaded)
    const seriesIds = series.map((s) => s.id);
    const countRows =
      seriesIds.length > 0
        ? await this.chapterRepo
            .createQueryBuilder("chapter")
            .select("chapter.seriesId", "seriesId")
            .addSelect("COUNT(*)", "count")
            .where("chapter.seriesId IN (:...seriesIds)", { seriesIds })
            .groupBy("chapter.seriesId")
            .getRawMany()
        : [];
    const chapterCountBySeriesId = new Map(
      countRows.map((r) => [r.seriesId, Number(r.count)]),
    );

    const data = series.map((s) => {
      const assignment = s.assignmentId
        ? assignmentMap.get(s.assignmentId)
        : null;
      return {
        id: s.id,
        title: s.title,
        cover: s.featuredImage || "/placeholder.svg",
        totalChapters: chapterCountBySeriesId.get(s.id) ?? 0,
        status: s.status,
        translator: assignment?.translator?.username || null,
        categories: s.categories?.map((c) => c.name) || [],
      };
    });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async toggleTranslatorStatus(translatorId: string) {
    const translator = await this.userService.findOne({
      where: { id: translatorId, role: Role.TRANSLATOR },
    });

    if (!translator)
      throw new NotFoundException("Translator with this ID not found");

    if (translator.deletedAt) {
      // Activate: restore soft-deleted user
      await this.userService.updateUser(translatorId, { deletedAt: null });
    } else {
      // Suspend: soft-delete user
      await this.userService.updateUser(translatorId, {
        deletedAt: new Date(),
      });
    }

    return { message: "Translator status updated successfully" };
  }

  async deleteTranslator(translatorId: string) {
    const translator = await this.userService.findOne({
      where: { id: translatorId, role: Role.TRANSLATOR },
    });

    if (!translator)
      throw new NotFoundException("Translator with this ID not found");

    // Hard delete (permanent removal)
    await this.userService.updateUser(translatorId, {
      deletedAt: new Date(),
    });

    return { message: "Translator deleted successfully" };
  }

  async deleteSeries(seriesId: string) {
    const series = await this.seriesRepo.findOne({
      where: { id: seriesId },
    });

    if (!series) {
      throw new NotFoundException("Series not found");
    }

    // Soft delete all chapters associated with this series (only non-deleted ones)
    const chapters = await this.chapterRepo.find({
      where: { seriesId },
    });

    if (chapters.length > 0) {
      await this.chapterRepo.softRemove(chapters);
    }

    // Soft delete the series
    await this.seriesRepo.softRemove(series);

    return { message: "Series deleted successfully" };
  }

  async getSeriesChapters(seriesId: string) {
    const series = await this.seriesRepo.findOne({
      where: { id: seriesId },
    });

    if (!series) {
      throw new NotFoundException("Series not found");
    }

    const chapters = await this.chapterRepo.find({
      where: { seriesId },
      order: { chapterNumber: "DESC" },
    });

    return chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      chapterNumber: chapter.chapterNumber,
      isPremium: chapter.isPremium,
      publishDate: chapter.publishDate.toISOString(),
      language: chapter.language,
      priceInCoins: chapter.priceInCoins || 20,
      readCount: Number(chapter.readCount),
      content: chapter.content,
      notes: chapter.notes || undefined,
    }));
  }

  async getChapterContent(chapterId: string) {
    const chapter = await this.chapterRepo.findOne({
      where: { id: chapterId },
    });

    if (!chapter) {
      throw new NotFoundException("Chapter not found");
    }

    return {
      id: chapter.id,
      title: chapter.title,
      chapterNumber: chapter.chapterNumber,
      isPremium: chapter.isPremium,
      publishDate: chapter.publishDate.toISOString(),
      language: chapter.language,
      priceInCoins: chapter.priceInCoins || 20,
      readCount: Number(chapter.readCount),
      content: chapter.content,
      notes: chapter.notes || undefined,
    };
  }

  async toggleChapterPremium(chapterId: string) {
    const chapter = await this.chapterRepo.findOne({
      where: { id: chapterId },
    });

    if (!chapter) {
      throw new NotFoundException("Chapter not found");
    }

    chapter.isPremium = !chapter.isPremium;
    await this.chapterRepo.save(chapter);

    if (!chapter.isPremium) {
      this.eventEmitter.emit(events.chapter.madeFree, {
        chapter,
        seriesId: chapter.seriesId,
      });
    }

    return {
      message: `Chapter ${chapter.isPremium ? "set to premium" : "set to free"}`,
    };
  }

  async deleteChapter(chapterId: string) {
    const chapter = await this.chapterRepo.findOne({
      where: { id: chapterId },
    });

    if (!chapter) {
      throw new NotFoundException("Chapter not found");
    }

    await this.chapterRepo.softRemove(chapter);

    return { message: "Chapter deleted successfully" };
  }

  async getStatistics() {
    // Get total novels (non-deleted series)
    const totalNovels = await this.seriesRepo.count({
      where: { deletedAt: IsNull() },
    });

    // Get total chapters (non-deleted)
    const totalChapters = await this.chapterRepo.count({
      where: { deletedAt: IsNull() },
    });

    // Get total translators (active)
    const totalTranslators = await this.userRepo.count({
      where: { role: Role.TRANSLATOR, deletedAt: IsNull() },
    });

    // Get total users (readers, active)
    const totalUsers = await this.userRepo.count({
      where: { role: Role.READER, deletedAt: IsNull() },
    });

    // Get coins purchased this month (completed purchases)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const coinPurchasesThisMonth = await this.coinPurchaseRepo
      .createQueryBuilder("coinPurchase")
      .select("SUM(coinPurchase.coinAmount)", "total")
      .where("coinPurchase.status = :status", { status: "completed" })
      .andWhere("coinPurchase.purchaseDate >= :startDate", {
        startDate: startOfMonth,
      })
      .getRawOne();

    const coinsPurchasedThisMonth = coinPurchasesThisMonth?.total
      ? parseInt(coinPurchasesThisMonth.total)
      : 0;

    return {
      totalNovels,
      totalChapters,
      totalTranslators,
      totalUsers,
      coinsPurchasedThisMonth,
    };
  }

  async getRecentPurchasedChapters(limit: number = 10) {
    const purchases = await this.purchasedChapterRepo.find({
      relations: ["user", "chapter", "chapter.series"],
      order: {
        purchaseDate: "DESC",
        createdAt: "DESC",
      },
      take: limit,
    });

    return purchases.map((purchase) => ({
      id: purchase.id,
      novel: purchase.chapter?.series?.title || "Unknown",
      chapter: purchase.chapter?.title || "Unknown",
      purchasedBy: purchase.user?.username || "Unknown",
      coinsSpent: purchase.price || 0,
      date: purchase.createdAt.toISOString().split("T")[0],
    }));
  }

  async getRecentCoinPurchases(limit: number = 10) {
    const purchases = await this.coinPurchaseRepo.find({
      relations: ["user"],
      where: {status: "completed"},
      order: {
        purchaseDate: "DESC",
        createdAt: "DESC",
      },
      take: limit,
    });

    return purchases.map((purchase) => ({
      id: purchase.id,
      user: purchase.user?.username || "Unknown",
      packageName: `${purchase.coinAmount} Coins`,
      coinsAmount: purchase.coinAmount,
      amountPaid: `$${Number(purchase.amountPaid).toFixed(2)}`,
      date: purchase.purchaseDate.toISOString().split("T")[0],
      status: purchase.status,
    }));
  }
}
