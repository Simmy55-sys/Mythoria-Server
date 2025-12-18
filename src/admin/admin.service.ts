import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import BaseService from "src/interface/service/base.service";
import { UserService } from "src/user/user.service";
import { EntityManager, Repository } from "typeorm";
import { Role } from "src/global/enum";
import { generatePassword } from "src/utils/password-generator";
import { EmailService } from "src/email/email.service";
import { TranslatorAssignment } from "src/model/series-translator-assignment.entity";
import { AccountService } from "src/account/account.service";
import { ulid } from "ulid";

@Injectable()
export class AdminService extends BaseService {
  constructor(
    private userService: UserService,
    private accountService: AccountService,
    private emailService: EmailService,
    @InjectRepository(TranslatorAssignment)
    private translatorAssignmentRepo: Repository<TranslatorAssignment>,
  ) {
    super();
  }

  async createTranslator(
    createUserDto: Omit<CreateUserDto, "password" | "role">,
    transactionalEntity?: EntityManager,
  ) {
    const generatedPassword = generatePassword();
    const translator = await this.accountService.registerTranslator(
      { ...createUserDto, password: generatedPassword },
      transactionalEntity,
    );

    await this.emailService.sendAccountCreatedByAdmin({
      username: translator.username,
      email: translator.email,
      password: translator.password,
    });

    console.log(generatedPassword);
    return translator;
  }

  async assignSeriesToTranslator(
    translatorId: string,
    opt: {
      name: string;
      rating?: string;
    },
  ) {
    const translator = await this.userService.findOne({
      where: { id: translatorId, role: Role.TRANSLATOR },
    });
    if (!translator)
      throw new NotFoundException("Translator with this ID not found");

    // Assign the series to the translator and give the series its name and maybe a rating
    return this.translatorAssignmentRepo.save(
      this.translatorAssignmentRepo.create({
        translatorId,
        seriesName: opt.name,
        adminRating: opt.rating ? parseInt(opt.rating) : undefined,
        assignmentId: ulid(),
      }),
    );
  }
}
