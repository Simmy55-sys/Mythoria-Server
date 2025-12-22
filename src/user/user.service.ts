import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "src/model/user.entity";
import { EntityManager, FindOptionsWhere, Repository } from "typeorm";
import { CreateUserDto } from "./dto/create-user.dto";
import { PasswordService } from "src/password/password.service";
import BaseService from "src/interface/service/base.service";

@Injectable()
export class UserService extends BaseService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    private passwordService: PasswordService,
  ) {
    super();
  }

  async create(createDto: CreateUserDto, transactionalEntity?: EntityManager) {
    const hashed = await this.passwordService.hashPassword(createDto.password);
    const user = this.usersRepo.create({ ...createDto, password: hashed });
    return this.performEntityOps<User, User>({
      repositoryManager: this.usersRepo,
      transactionalEntity,
      action: "save",
      opsArgs: [user],
    });
  }

  async findOne(
    options?: {
      relations?: Array<string>;
      where?: FindOptionsWhere<User> | FindOptionsWhere<User>[];
    },
    transactionalEntity?: EntityManager,
  ) {
    return this.performEntityOps<User, User>({
      repositoryManager: this.usersRepo,
      transactionalEntity,
      action: "findOne",
      opsArgs: [
        User,
        {
          ...(options?.where && { where: options.where }),
          ...(options?.relations && { relations: options.relations }),
        },
      ],
    });
  }

  async findMany(
    options?: {
      relations?: Array<string>;
      where?: FindOptionsWhere<User> | FindOptionsWhere<User>[];
    },
    transactionalEntity?: EntityManager,
  ) {
    return this.performEntityOps<User, User[]>({
      repositoryManager: this.usersRepo,
      transactionalEntity,
      action: "find",
      opsArgs: [
        User,
        {
          ...(options?.where && { where: options.where }),
          ...(options?.relations && { relations: options.relations }),
        },
      ],
    });
  }

  async updateUser(
    id: string,
    newRecord: Partial<User>,
    transactionalEntity?: EntityManager,
  ) {
    await this.performEntityOps<User, User>({
      repositoryManager: this.usersRepo,
      transactionalEntity,
      action: "update",
      opsArgs: [User, { id }, { ...newRecord }],
    });
  }

  async getProfile(id: string, transactionalEntity?: EntityManager) {
    return this.performEntityOps<User, User>({
      repositoryManager: this.usersRepo,
      transactionalEntity,
      action: "findOne",
      opsArgs: [
        User,
        {
          where: { id },
          select: ["id", "username", "email", "role", "coinBalance"],
        },
      ],
    });
  }
}
