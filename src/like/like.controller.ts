import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { LikeService } from "./like.service";
import { Request } from "express";
import { IsAuthenticated } from "src/account/guard/is-authenticated.guard";

@Controller("like")
export class LikeController {
  constructor(private readonly likeService: LikeService) {}

  @Post("series/:seriesId")
  @UseGuards(IsAuthenticated)
  async likeSeries(
    @Param("seriesId") seriesId: string,
    @Req() request: Request,
  ) {
    const { user } = request;
    return this.likeService.likeSeries(user?.id ?? "", seriesId);
  }

  @Delete("series/:seriesId")
  @UseGuards(IsAuthenticated)
  async unlikeSeries(
    @Param("seriesId") seriesId: string,
    @Req() request: Request,
  ) {
    const { user } = request;
    return this.likeService.unlikeSeries(user?.id ?? "", seriesId);
  }

  @Get("series/:seriesId")
  @UseGuards(IsAuthenticated)
  async checkLike(
    @Param("seriesId") seriesId: string,
    @Req() request: Request,
  ) {
    const { user } = request;
    const isLiked = await this.likeService.isLiked(user?.id ?? "", seriesId);
    return { isLiked };
  }
}
