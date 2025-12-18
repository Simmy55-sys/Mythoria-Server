import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CommentService } from "./comment.service";
import { CreateCommentDto } from "./dto/create-comment.dto";
import { Request } from "express";
import { IsAuthenticated } from "src/account/guard/is-authenticated.guard";
import { commentResponseTransformer } from "src/transformers/comment.transformer";

@Controller("comment")
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(IsAuthenticated)
  async createComment(@Body() dto: CreateCommentDto, @Req() request: Request) {
    const { user } = request;
    return commentResponseTransformer(
      await this.commentService.createComment(user?.id ?? "", dto),
    );
  }

  @Get("series/:seriesId")
  async getCommentsBySeries(@Param("seriesId") seriesId: string) {
    return this.commentService.getCommentsBySeries(seriesId, {
      includeReplies: true,
    });
  }

  @Get("chapter/:chapterId")
  async getCommentsByChapter(@Param("chapterId") chapterId: string) {
    return this.commentService.getCommentsByChapter(chapterId, {
      includeReplies: true,
    });
  }

  @Delete(":commentId")
  @UseGuards(IsAuthenticated)
  async deleteComment(
    @Param("commentId") commentId: string,
    @Req() request: Request,
  ) {
    const { user } = request;
    return this.commentService.deleteComment(commentId, user?.id ?? "");
  }
}
