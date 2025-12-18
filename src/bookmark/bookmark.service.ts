import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Bookmark } from "src/model/bookmark.entity";
import { Series } from "src/model/series.entity";
import { Repository } from "typeorm";
import BaseService from "src/interface/service/base.service";

@Injectable()
export class BookmarkService extends BaseService {
  constructor(
    @InjectRepository(Bookmark)
    private readonly repo: Repository<Bookmark>,
    @InjectRepository(Series)
    private readonly seriesRepo: Repository<Series>,
  ) {
    super();
  }

  async bookmarkSeries(userId: string, seriesId: string) {
    // Check if series exists
    const series = await this.seriesRepo.findOne({
      where: { id: seriesId },
    });

    if (!series) {
      throw new NotFoundException("Series not found");
    }

    // Check if already bookmarked
    const existingBookmark = await this.repo.findOne({
      where: { userId, seriesId },
    });

    if (existingBookmark) {
      throw new ConflictException("Series is already bookmarked");
    }

    // Create bookmark
    const bookmark = this.repo.create({
      userId,
      seriesId,
      bookmarkedAt: new Date(),
    });

    return this.repo.save(bookmark);
  }

  async removeBookmark(userId: string, seriesId: string) {
    const bookmark = await this.repo.findOne({
      where: { userId, seriesId },
    });

    if (!bookmark) {
      throw new NotFoundException("Bookmark not found");
    }

    await this.repo.remove(bookmark);
    return { message: "Bookmark removed successfully" };
  }

  async isBookmarked(userId: string, seriesId: string): Promise<boolean> {
    const bookmark = await this.repo.findOne({
      where: { userId, seriesId },
    });
    return !!bookmark;
  }

  async getUserBookmarks(userId: string) {
    return this.repo.find({
      where: { userId },
      relations: ["series", "series.categories"],
      order: { bookmarkedAt: "DESC" },
    });
  }

  async getBookmarkedSeriesIds(userId: string): Promise<string[]> {
    const bookmarks = await this.repo.find({
      where: { userId },
      select: ["seriesId"],
    });
    return bookmarks.map((b) => b.seriesId);
  }
}

