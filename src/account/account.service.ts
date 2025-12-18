import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { PasswordService } from "src/password/password.service";
import { UserService } from "src/user/user.service";
import { EntityManager } from "typeorm";
import { LoginDto } from "./dto/login.dto";
import { JwtService } from "@nestjs/jwt";
import { Role } from "src/global/enum";
import { CreateUserDto } from "src/user/dto/create-user.dto";

@Injectable()
export class AccountService {
  constructor(
    private userService: UserService,
    private passwordService: PasswordService,
    private jwtService: JwtService,
  ) {}

  async changeUserPassword(
    userId: string,
    password: { new: string; old: string },
    transactionalEntity?: EntityManager,
  ) {
    const user = await this.userService.findOne(
      {
        where: { id: userId },
      },
      transactionalEntity,
    );

    if (!user) throw new NotFoundException("User not found");

    // Compare old password
    const isMatch = await this.passwordService.comparePasswords(
      password.old,
      user.password,
    );
    if (!isMatch) throw new BadRequestException("Old password is incorrect");

    // Hash new password
    const hashedNewPassword = await this.passwordService.hashPassword(
      password.new,
    );

    // Update user record
    await this.userService.updateUser(
      userId,
      { password: hashedNewPassword },
      transactionalEntity,
    );

    return { message: "Password changed successfully" };
  }

  async registerReader(
    registerReaderDto: CreateUserDto,
    transactionalEntity?: EntityManager,
  ) {
    const existingUser = await this.userService.findOne({
      where: { email: registerReaderDto.email, role: Role.READER },
    });
    if (existingUser)
      throw new BadRequestException("Reader with this email already exists");

    const user = await this.userService.create(
      { ...registerReaderDto, role: Role.READER },
      transactionalEntity,
    );
    return user;
  }

  async registerTranslator(
    registerTranslatorDto: CreateUserDto,
    transactionalEntity?: EntityManager,
  ) {
    const existingTranslator = await this.userService.findOne({
      where: { email: registerTranslatorDto.email, role: Role.TRANSLATOR },
    });
    if (existingTranslator)
      throw new BadRequestException(
        "Translator with this email already exists",
      );

    const translator = await this.userService.create(
      { ...registerTranslatorDto, role: Role.TRANSLATOR },
      transactionalEntity,
    );
    return translator;
  }

  async login(
    loginDto: LoginDto,
    role: Role,
    transactionalEntity?: EntityManager,
  ) {
    const user = await this.userService.findOne(
      {
        where: { email: loginDto.email, role },
      },
      transactionalEntity,
    );
    if (!user) throw new UnauthorizedException("Invalid password or email");

    const isMatch = await this.passwordService.comparePasswords(
      loginDto.password,
      user.password,
    );
    if (!isMatch) throw new UnauthorizedException("Invalid password or email");

    const payload = { id: user.id, role: user.role };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }
}
