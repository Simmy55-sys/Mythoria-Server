import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Comment } from "src/model/comment.entity";
import { EntityManager, Repository } from "typeorm";
import { CreateCommentDto } from "./dto/create-comment.dto";
import BaseService from "src/interface/service/base.service";
import { plainToInstance } from "class-transformer";
import { Series } from "src/model/series.entity";
import { Chapter } from "src/model/chapter.entity";
import { CommentResponseDto } from "src/transformers/dto/comment-response.dto";

@Injectable()
export class CommentService extends BaseService {
  constructor(
    @InjectRepository(Comment)
    private readonly repo: Repository<Comment>,
    @InjectRepository(Series)
    private readonly seriesRepo: Repository<Series>,
    @InjectRepository(Chapter)
    private readonly chapterRepo: Repository<Chapter>,
  ) {
    super();
  }

  async createComment(
    userId: string,
    dto: CreateCommentDto,
    transactionalEntity?: EntityManager,
  ) {
    // Validate that either seriesId OR chapterId is provided (not both, not neither)
    if (!dto.seriesId && !dto.chapterId) {
      throw new BadRequestException(
        "Either seriesId or chapterId must be provided",
      );
    }

    if (dto.seriesId && dto.chapterId) {
      throw new BadRequestException(
        "Cannot provide both seriesId and chapterId",
      );
    }

    // If replying to a comment, validate parent comment exists
    let parentComment: Comment | null = null;
    if (dto.parentCommentId) {
      parentComment = await this.repo.findOne({
        where: { id: dto.parentCommentId },
        relations: ["series", "chapter"],
      });

      if (!parentComment) {
        throw new NotFoundException("Parent comment not found");
      }

      // Inherit seriesId/chapterId from parent if not provided
      if (!dto.seriesId && !dto.chapterId) {
        dto.seriesId = parentComment.seriesId || undefined;
        dto.chapterId = parentComment.chapterId || undefined;
      }
    }

    // Validate series/chapter exists
    if (dto.seriesId) {
      const series = await this.seriesRepo.findOne({
        where: { id: dto.seriesId },
      });
      if (!series) {
        throw new NotFoundException("Series not found");
      }
    }

    if (dto.chapterId) {
      const chapter = await this.chapterRepo.findOne({
        where: { id: dto.chapterId },
      });
      if (!chapter) {
        throw new NotFoundException("Chapter not found");
      }
    }

    // Create comment (auto-approved)
    const commentData = {
      ...dto,
      userId,
      status: "approved" as const,
    };

    return this.performEntityOps<Comment, Comment>({
      repositoryManager: this.repo,
      transactionalEntity,
      action: "save",
      opsArgs: [this.repo.create(commentData)],
    });
  }

  private transformCommentWithReplies(comment: Comment): CommentResponseDto {
    const transformed = plainToInstance(CommentResponseDto, comment, {
      excludeExtraneousValues: true,
    });

    if (comment.replies && comment.replies.length > 0) {
      transformed.replies = comment.replies.map((reply) =>
        this.transformCommentWithReplies(reply),
      );
    }

    return transformed;
  }

  async getCommentsBySeries(
    seriesId: string,
    options?: { includeReplies?: boolean },
  ) {
    const series = await this.seriesRepo.findOne({
      where: { id: seriesId },
    });

    if (!series) {
      throw new NotFoundException("Series not found");
    }

    const query = this.repo
      .createQueryBuilder("comment")
      .leftJoinAndSelect("comment.user", "user")
      .where("comment.seriesId = :seriesId", { seriesId })
      .andWhere("comment.status = :status", { status: "approved" })
      .andWhere("comment.parentCommentId IS NULL") // Only top-level comments
      .orderBy("comment.createdAt", "DESC");

    const comments = await query.getMany();

    // If including replies, load them for each comment
    if (options?.includeReplies) {
      for (const comment of comments) {
        comment.replies = await this.repo.find({
          where: {
            parentCommentId: comment.id,
            status: "approved",
          },
          relations: ["user"],
          order: { createdAt: "ASC" },
        });
      }
    }

    return comments.map((comment) => this.transformCommentWithReplies(comment));
  }

  async getCommentsByChapter(
    chapterId: string,
    options?: { includeReplies?: boolean },
  ) {
    const chapter = await this.chapterRepo.findOne({
      where: { id: chapterId },
    });

    if (!chapter) {
      throw new NotFoundException("Chapter not found");
    }

    const query = this.repo
      .createQueryBuilder("comment")
      .leftJoinAndSelect("comment.user", "user")
      .where("comment.chapterId = :chapterId", { chapterId })
      .andWhere("comment.status = :status", { status: "approved" })
      .andWhere("comment.parentCommentId IS NULL") // Only top-level comments
      .orderBy("comment.createdAt", "DESC");

    const comments = await query.getMany();

    // If including replies, load them for each comment
    if (options?.includeReplies) {
      for (const comment of comments) {
        comment.replies = await this.repo.find({
          where: {
            parentCommentId: comment.id,
            status: "approved",
          },
          relations: ["user"],
          order: { createdAt: "ASC" },
        });
      }
    }

    return comments.map((comment) => this.transformCommentWithReplies(comment));
  }

  async getCommentCount(
    seriesId?: string,
    chapterId?: string,
  ): Promise<number> {
    const query = this.repo
      .createQueryBuilder("comment")
      .where("comment.status = :status", { status: "approved" });

    if (seriesId) {
      query.andWhere("comment.seriesId = :seriesId", { seriesId });
    }

    if (chapterId) {
      query.andWhere("comment.chapterId = :chapterId", { chapterId });
    }

    return query.getCount();
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.repo.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException("Comment not found");
    }

    // Only allow users to delete their own comments
    if (comment.userId !== userId) {
      throw new BadRequestException("You can only delete your own comments");
    }

    // Delete comment (cascade will handle replies)
    await this.repo.remove(comment);
    return { message: "Comment deleted successfully" };
  }
}
