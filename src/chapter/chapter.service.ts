import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectEntityManager, InjectRepository } from "@nestjs/typeorm";
import { Chapter } from "src/model/chapter.entity";
import { EntityManager, Repository } from "typeorm";
import { CreateChapterDto } from "./dto/create-chapter.dto";
import BaseService from "src/interface/service/base.service";
import { UpdateChapterDto } from "./dto/update-chapter.dto";
import { plainToInstance } from "class-transformer";
import { PublicChapterDto } from "./dto/public-chapter.dto";
import { PurchasedChapter } from "src/model/purchased-chapter.entity";
import { ChapterRead } from "src/model/chapter-read.entity";
import { FileReaderService } from "src/file-reader/file-reader.service";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { Series } from "src/model/series.entity";
import { User } from "src/model/user.entity";

@Injectable()
export class ChapterService extends BaseService {
  constructor(
    @InjectRepository(Chapter)
    private readonly repo: Repository<Chapter>,
    @InjectRepository(PurchasedChapter)
    private readonly purchasedChapterRepo: Repository<PurchasedChapter>,
    @InjectRepository(ChapterRead)
    private readonly chapterReadRepo: Repository<ChapterRead>,
    @InjectRepository(Series)
    private readonly seriesRepo: Repository<Series>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly fileReaderService: FileReaderService,
    private readonly cloudinaryService: CloudinaryService,
    @InjectEntityManager() private manager: EntityManager,
  ) {
    super();
  }

  async createChapter(
    seriesId: string,
    dto: CreateChapterDto,
    chapterFile?: Express.Multer.File,
    transactionalEntity?: EntityManager,
  ) {
    // Get series to use its title for folder structure
    const series = await this.seriesRepo.findOne({ where: { id: seriesId } });
    if (!series) {
      throw new BadRequestException("Series not found");
    }

    let extractedContent = dto.content || "";
    let fileUrl: string | undefined;

    // If a file is uploaded, extract text and upload to Cloudinary
    if (chapterFile) {
      try {
        // Extract text content from the file
        extractedContent =
          await this.fileReaderService.extractTextFromFile(chapterFile);

        // Upload original file to Cloudinary
        const uploadResult = await this.cloudinaryService.uploadFile(
          chapterFile,
          `chapters/${series.slug}/chapter-${dto.chapterNumber}`,
        );

        if (!uploadResult) {
          throw new BadRequestException("Failed to upload chapter file");
        }

        fileUrl = uploadResult.secure_url;
      } catch (error: any) {
        throw new BadRequestException(
          `Failed to process chapter file: ${error.message}`,
        );
      }
    }

    // Validate that we have content (either from file, gdrive, or inbuilt editor)
    if (!extractedContent || extractedContent.trim() === "") {
      throw new BadRequestException(
        "Chapter content is required. Please provide content via file upload, Google Drive link, or inbuilt editor.",
      );
    }

    // Create chapter with extracted content and file URL
    const chapterData = {
      ...dto,
      content: extractedContent,
      fileUrl,
      seriesId,
    };

    return this.performEntityOps<Chapter, Chapter>({
      repositoryManager: this.repo,
      transactionalEntity,
      action: "save",
      opsArgs: [this.repo.create(chapterData)],
    });
  }

  async updateChapter(
    seriesId: string,
    id: string,
    dto: UpdateChapterDto,
    transactionalEntity?: EntityManager,
  ) {
    return this.performEntityOps<Chapter, Chapter>({
      repositoryManager: this.repo,
      transactionalEntity,
      action: "update",
      opsArgs: [Chapter, { seriesId, id }, { ...dto }],
    });
  }

  async deleteChapter(
    seriesId: string,
    id: string,
    transactionalEntity?: EntityManager,
  ) {
    return this.performEntityOps<Chapter, void>({
      repositoryManager: this.repo,
      transactionalEntity,
      action: "delete",
      opsArgs: [Chapter, { seriesId, id }],
    });
  }

  async findOne(
    seriesId: string,
    id: string,
    transactionalEntity?: EntityManager,
  ) {
    return this.performEntityOps<Chapter, Chapter>({
      repositoryManager: this.repo,
      transactionalEntity,
      action: "findOne",
      opsArgs: [Chapter, { where: { seriesId, id }, relations: ["series"] }],
    });
  }

  async findBySeries(seriesId: string, transactionalEntity?: EntityManager) {
    return this.performEntityOps<Chapter, Chapter[]>({
      repositoryManager: this.repo,
      transactionalEntity,
      action: "find",
      opsArgs: [Chapter, { where: { seriesId }, relations: ["series"] }],
    });
  }

  async findBySeriesAndChapterNumber(
    seriesId: string,
    chapterNumber: number,
    transactionalEntity?: EntityManager,
  ) {
    return this.performEntityOps<Chapter, Chapter>({
      repositoryManager: this.repo,
      transactionalEntity,
      action: "findOne",
      opsArgs: [
        Chapter,
        { where: { seriesId, chapterNumber }, relations: ["series"] },
      ],
    });
  }

  async getChapterIdBySlugAndNumber(
    seriesSlug: string,
    chapterNumber: number,
  ): Promise<string | null> {
    const series = await this.seriesRepo.findOne({
      where: { slug: seriesSlug, isVisible: true },
    });

    if (!series) {
      return null;
    }

    const chapter = await this.repo.findOne({
      where: { seriesId: series.id, chapterNumber },
    });

    return chapter?.id || null;
  }

  async findBySlugAndChapterNumber(
    seriesSlug: string,
    chapterNumber: number,
    purchased: boolean = false,
    userId?: string,
    sessionId?: string,
    transactionalEntity?: EntityManager,
  ) {
    // First get the series by slug
    const series = await this.seriesRepo.findOne({
      where: { slug: seriesSlug, isVisible: true },
    });

    if (!series) {
      throw new NotFoundException("Series not found");
    }

    // Get chapter by series ID and chapter number
    const chapter = await this.performEntityOps<Chapter, Chapter>({
      repositoryManager: this.repo,
      transactionalEntity,
      action: "findOne",
      opsArgs: [
        Chapter,
        {
          where: { seriesId: series.id, chapterNumber },
          relations: ["series"],
        },
      ],
    });

    if (!chapter) {
      throw new NotFoundException("Chapter not found");
    }

    // Track read and increment counter
    await this.trackChapterRead(chapter.id, userId, sessionId);

    // If purchased → override isPremium flag for content visibility
    if (purchased) {
      chapter.isPremium = false;
    }

    // Get next and previous chapters
    const [prevChapter, nextChapter] = await Promise.all([
      this.repo.findOne({
        where: {
          seriesId: series.id,
          chapterNumber: chapterNumber - 1,
        },
        order: { chapterNumber: "DESC" },
      }),
      this.repo.findOne({
        where: {
          seriesId: series.id,
          chapterNumber: chapterNumber + 1,
        },
        order: { chapterNumber: "ASC" },
      }),
    ]);

    // Check purchase status for prev/next chapters if user is authenticated
    let prevChapterIsPremium = prevChapter?.isPremium ?? false;
    let nextChapterIsPremium = nextChapter?.isPremium ?? false;

    if (userId && prevChapter) {
      const prevPurchased = await this.hasPurchasedChapter(
        userId,
        prevChapter.id,
        transactionalEntity,
      );
      if (prevPurchased) {
        prevChapterIsPremium = false;
      }
    }

    if (userId && nextChapter) {
      const nextPurchased = await this.hasPurchasedChapter(
        userId,
        nextChapter.id,
        transactionalEntity,
      );
      if (nextPurchased) {
        nextChapterIsPremium = false;
      }
    }

    return {
      chapter: plainToInstance(PublicChapterDto, chapter, {
        excludeExtraneousValues: true,
      }),
      prevChapter: prevChapter
        ? {
            id: prevChapter.id,
            chapterNumber: prevChapter.chapterNumber,
            title: prevChapter.title,
            isPremium: prevChapterIsPremium,
          }
        : null,
      nextChapter: nextChapter
        ? {
            id: nextChapter.id,
            chapterNumber: nextChapter.chapterNumber,
            title: nextChapter.title,
            isPremium: nextChapterIsPremium,
          }
        : null,
      series: {
        id: series.id,
        title: series.title,
        slug: series.slug,
      },
    };
  }

  async publicChapter(
    seriesId: string,
    id: string,
    purchased: boolean = false,
    userId?: string,
    sessionId?: string,
    transactionalEntity?: EntityManager,
  ) {
    const chapter = await this.performEntityOps<Chapter, Chapter>({
      repositoryManager: this.repo,
      transactionalEntity,
      action: "update",
      opsArgs: [Chapter, { seriesId, id }, { isPublished: true }],
    });

    // Track read and increment counter
    await this.trackChapterRead(id, userId, sessionId);

    // If purchased → override isPremium flag for content visibility
    if (purchased) {
      chapter.isPremium = false;
    }

    return plainToInstance(PublicChapterDto, chapter, {
      excludeExtraneousValues: true,
    });
  }

  private async trackChapterRead(
    chapterId: string,
    userId?: string,
    sessionId?: string,
  ) {
    // perform atomic operation
    await this.manager.transaction(async (transactionalEntity) => {
      // Determine if this is a new read
      let isNewRead = false;

      if (userId) {
        // Check if authenticated user has already read this chapter
        const existingRead = await this.performEntityOps<
          ChapterRead,
          ChapterRead | null
        >({
          repositoryManager: this.chapterReadRepo,
          transactionalEntity,
          action: "findOne",
          opsArgs: [ChapterRead, { where: { userId, chapterId } }],
        });

        if (!existingRead) {
          isNewRead = true;
          await this.performEntityOps<ChapterRead, ChapterRead>({
            repositoryManager: this.chapterReadRepo,
            transactionalEntity,
            action: "save",
            opsArgs: [
              this.chapterReadRepo.create({
                chapterId,
                userId,
                readDate: new Date(),
              }),
            ],
          });
        }
      } else if (sessionId) {
        // Check if anonymous user (session) has already read this chapter
        const existingRead = await this.performEntityOps<
          ChapterRead,
          ChapterRead | null
        >({
          repositoryManager: this.chapterReadRepo,
          transactionalEntity,
          action: "findOne",
          opsArgs: [ChapterRead, { where: { sessionId, chapterId } }],
        });

        if (!existingRead) {
          isNewRead = true;
          await this.performEntityOps<ChapterRead, ChapterRead>({
            repositoryManager: this.chapterReadRepo,
            transactionalEntity,
            action: "save",
            opsArgs: [
              this.chapterReadRepo.create({
                chapterId,
                sessionId,
                readDate: new Date(),
              }),
            ],
          });
        }
      }

      // Increment read count if this is a new read
      if (isNewRead) {
        await transactionalEntity.increment(
          Chapter,
          { id: chapterId },
          "readCount",
          1,
        );
      }
    });
  }

  async purchaseChapter(
    userId: string,
    chapterId: string,
    transactionalEntity?: EntityManager,
  ) {
    return this.manager.transaction(async (transactionalEntity) => {
      // Check if chapter exists
      const chapter = await this.performEntityOps<Chapter, Chapter>({
        repositoryManager: this.repo,
        transactionalEntity,
        action: "findOne",
        opsArgs: [Chapter, { where: { id: chapterId } }],
      });

      if (!chapter) {
        throw new NotFoundException("Chapter not found");
      }

      // Check if chapter is premium
      if (!chapter.isPremium) {
        throw new BadRequestException(
          "This chapter is free and does not require purchase",
        );
      }

      // Check if already purchased
      const alreadyPurchased = await this.hasPurchasedChapter(
        userId,
        chapterId,
        transactionalEntity,
      );
      if (alreadyPurchased) {
        throw new BadRequestException("Chapter already purchased");
      }

      // Get user with lock for balance check
      const user = await transactionalEntity.findOne(User, {
        where: { id: userId },
        lock: { mode: "pessimistic_write" },
      });

      if (!user) {
        throw new NotFoundException("User not found");
      }

      // Check if user has enough coins
      const priceInCoins = chapter.priceInCoins || 20;
      if (user.coinBalance < priceInCoins) {
        throw new BadRequestException(
          `You don't have enough coins to purchase this chapter. Required: ${priceInCoins}, Available: ${user.coinBalance}`,
        );
      }

      // Deduct coins from user balance
      user.coinBalance -= priceInCoins;
      await transactionalEntity.save(User, user);

      // Create purchase record
      const purchasedChapter = this.purchasedChapterRepo.create({
        userId,
        chapterId,
        purchaseDate: new Date(),
      });

      const savedPurchase = await this.performEntityOps<
        PurchasedChapter,
        PurchasedChapter
      >({
        repositoryManager: this.purchasedChapterRepo,
        transactionalEntity,
        action: "save",
        opsArgs: [purchasedChapter],
      });

      return {
        id: savedPurchase.id,
        chapterId: savedPurchase.chapterId,
        purchaseDate: savedPurchase.purchaseDate,
        remainingBalance: user.coinBalance,
      };
    });
  }

  async hasPurchasedChapter(
    userId: string,
    chapterId: string,
    transactionalEntity?: EntityManager,
  ) {
    const purchasedChapter = await this.performEntityOps<
      PurchasedChapter,
      PurchasedChapter
    >({
      repositoryManager: this.purchasedChapterRepo,
      transactionalEntity,
      action: "findOne",
      opsArgs: [PurchasedChapter, { where: { userId, chapterId } }],
    });

    return !!purchasedChapter;
  }

  async getLatestChapters(limit: number = 10) {
    // Get latest chapters from visible series, ordered by publish date
    const chapters = await this.repo
      .createQueryBuilder("chapter")
      .leftJoinAndSelect("chapter.series", "series")
      .leftJoinAndSelect("series.categories", "categories")
      .where("series.isVisible = :isVisible", { isVisible: true })
      .orderBy("chapter.publishDate", "DESC")
      .addOrderBy("chapter.createdAt", "DESC")
      .take(limit)
      .getMany();

    return chapters;
  }
}
