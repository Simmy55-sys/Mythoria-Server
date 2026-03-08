import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ReadingProgress } from "src/model/reading-progress.entity";
import { UserChapterRead } from "src/model/user-chapter-read.entity";
import { Series } from "src/model/series.entity";
import { Chapter } from "src/model/chapter.entity";
import { In, Repository } from "typeorm";
import BaseService from "src/interface/service/base.service";

const ONGOING_MIN_CHAPTERS_READ = 3;

export interface OngoingSeriesItem {
  seriesId: string;
  title: string;
  slug: string;
  featuredImage: string | null;
  lastChapterNumber: number;
  totalChapters: number;
  updatedAt: Date;
}

@Injectable()
export class ReadingProgressService extends BaseService {
  constructor(
    @InjectRepository(ReadingProgress)
    private readonly repo: Repository<ReadingProgress>,
    @InjectRepository(UserChapterRead)
    private readonly userChapterReadRepo: Repository<UserChapterRead>,
    @InjectRepository(Series)
    private readonly seriesRepo: Repository<Series>,
    @InjectRepository(Chapter)
    private readonly chapterRepo: Repository<Chapter>,
  ) {
    super();
  }

  async getLastReadChapter(
    userId: string,
    seriesId: string,
  ): Promise<number | null> {
    const progress = await this.repo.findOne({
      where: { userId, seriesId },
      select: ["lastChapterNumber"],
    });
    return progress?.lastChapterNumber ?? null;
  }

  /**
   * Records that the user read this chapter (with content). Only counts each chapter once.
   * lastChapterNumber is kept as the max chapter they've read (for "continue reading").
   */
  async setLastReadChapter(
    userId: string,
    seriesId: string,
    chapterNumber: number,
  ): Promise<{ lastChapterNumber: number }> {
    const series = await this.seriesRepo.findOne({
      where: { id: seriesId },
    });
    if (!series) {
      throw new NotFoundException("Series not found");
    }
    if (chapterNumber < 1) {
      throw new NotFoundException("Invalid chapter number");
    }

    // Only record up to 3 chapters per series (enough to determine "ongoing"); no need to store more
    const existingCount = await this.userChapterReadRepo.count({
      where: { userId, seriesId },
    });
    if (existingCount < ONGOING_MIN_CHAPTERS_READ) {
      const existing = await this.userChapterReadRepo.findOne({
        where: { userId, seriesId, chapterNumber },
      });
      if (!existing) {
        await this.userChapterReadRepo.save(
          this.userChapterReadRepo.create({
            userId,
            seriesId,
            chapterNumber,
          }),
        );
      }
    }

    // Update progress: last chapter = max(current, this chapter)
    let progress = await this.repo.findOne({
      where: { userId, seriesId },
    });
    const newLast = progress
      ? Math.max(progress.lastChapterNumber, chapterNumber)
      : chapterNumber;

    if (progress) {
      progress.lastChapterNumber = newLast;
      await this.repo.save(progress);
    } else {
      progress = this.repo.create({
        userId,
        seriesId,
        lastChapterNumber: newLast,
      });
      await this.repo.save(progress);
    }

    return { lastChapterNumber: progress.lastChapterNumber };
  }

  /**
   * Returns series where the reader has read at least ONGOING_MIN_CHAPTERS_READ *distinct* chapters
   * (only chapters they actually had access to – free or purchased – count).
   */
  async getOngoingSeries(userId: string): Promise<OngoingSeriesItem[]> {
    const readCounts = await this.userChapterReadRepo
      .createQueryBuilder("r")
      .select("r.series_id", "seriesId")
      .where("r.user_id = :userId", { userId })
      .groupBy("r.series_id")
      .having("COUNT(*) >= :min", { min: ONGOING_MIN_CHAPTERS_READ })
      .getRawMany<{ seriesId: string }>();

    if (readCounts.length === 0) return [];

    const seriesIds = readCounts.map((r) => r.seriesId);
    const progressList = await this.repo.find({
      where: { userId, seriesId: In(seriesIds) },
      relations: ["series"],
    });
    const progressBySeries = new Map(
      progressList.map((p) => [p.seriesId, p]),
    );

    const totalChaptersResult = await this.chapterRepo
      .createQueryBuilder("c")
      .select("c.series_id", "seriesId")
      .addSelect("COUNT(*)::int", "count")
      .where("c.series_id IN (:...ids)", { ids: seriesIds })
      .andWhere("c.deleted_at IS NULL")
      .groupBy("c.series_id")
      .getRawMany<{ seriesId: string; count: number }>();
    const totalBySeries = new Map(
      totalChaptersResult.map((r) => [r.seriesId, Number(r.count)]),
    );

    const items: OngoingSeriesItem[] = [];
    for (const r of readCounts) {
      const p = progressBySeries.get(r.seriesId);
      const series = p?.series;
      if (!series) continue;
      items.push({
        seriesId: r.seriesId,
        title: series.title,
        slug: series.slug,
        featuredImage: series.featuredImage ?? null,
        lastChapterNumber: p.lastChapterNumber,
        totalChapters: totalBySeries.get(r.seriesId) ?? 0,
        updatedAt: p.updatedAt,
      });
    }

    items.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return items;
  }
}
