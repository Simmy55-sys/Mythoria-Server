import { Expose, Type } from "class-transformer";

export class CommentUserDto {
  @Expose()
  id: string;

  @Expose()
  username: string;
}

export class CommentResponseDto {
  @Expose()
  id: string;

  @Expose()
  content: string;

  @Expose()
  status: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  @Type(() => CommentUserDto)
  user: CommentUserDto;

  @Expose()
  seriesId?: string;

  @Expose()
  chapterId?: string;

  @Expose()
  parentCommentId?: string;

  @Expose()
  @Type(() => CommentResponseDto)
  replies?: CommentResponseDto[];
}
