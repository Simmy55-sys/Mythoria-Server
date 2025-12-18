import { User } from "src/model/user.entity";
import transformerFactory from "./factory";
import { UserResponseDto } from "./dto/user-response.dto";

export function userResponseTransformer(user: Partial<User>) {
  return transformerFactory(user, UserResponseDto);
}
