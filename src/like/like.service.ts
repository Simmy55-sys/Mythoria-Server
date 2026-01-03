import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Like } from "src/model/like.entity";
import { Series } from "src/model/series.entity";
import { Repository } from "typeorm";
import BaseService from "src/interface/service/base.service";

@Injectable()
export class LikeService extends BaseService {
  constructor(
    @InjectRepository(Like)
    private readonly repo: Repository<Like>,
    @InjectRepository(Series)
    private readonly seriesRepo: Repository<Series>,
  ) {
    super();
  }

  async likeSeries(userId: string, seriesId: string) {
    // Check if series exists
    const series = await this.seriesRepo.findOne({
      where: { id: seriesId },
    });

    if (!series) {
      throw new NotFoundException("Series not found");
    }

    // Check if already liked
    const existingLike = await this.repo.findOne({
      where: { userId, seriesId },
    });

    if (existingLike) {
      throw new ConflictException("Series is already liked");
    }

    // Create like
    const like = this.repo.create({
      userId,
      seriesId,
      likedAt: new Date(),
    });

    return this.repo.save(like);
  }

  async unlikeSeries(userId: string, seriesId: string) {
    const like = await this.repo.findOne({
      where: { userId, seriesId },
    });

    if (!like) {
      throw new NotFoundException("Like not found");
    }

    await this.repo.remove(like);
    return { message: "Like removed successfully" };
  }

  async isLiked(userId: string, seriesId: string): Promise<boolean> {
    const like = await this.repo.findOne({
      where: { userId, seriesId },
    });
    return !!like;
  }
}
