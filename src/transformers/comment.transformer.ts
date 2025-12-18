import { CommentResponseDto } from "./dto/comment-response.dto";
import transformerFactory from "./factory";
import { Comment } from "src/model/comment.entity";

export function commentResponseTransformer(comment: Partial<Comment>) {
  return transformerFactory(comment, CommentResponseDto);
}
