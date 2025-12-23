import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateUserDto } from "src/user/dto/create-user.dto";
import BaseService from "src/interface/service/base.service";
import { UserService } from "src/user/user.service";
import { EntityManager, Repository, IsNull, Not, In } from "typeorm";
import { Role } from "src/global/enum";
import { generatePassword } from "src/utils/password-generator";
import { EmailService } from "src/email/email.service";
import { TranslatorAssignment } from "src/model/series-translator-assignment.entity";
import { AccountService } from "src/account/account.service";
import { ulid } from "ulid";
import { Series } from "src/model/series.entity";
import { Chapter } from "src/model/chapter.entity";

@Injectable()
export class AdminService extends BaseService {
  constructor(
    private userService: UserService,
    private accountService: AccountService,
    private emailService: EmailService,
    @InjectRepository(TranslatorAssignment)
    private translatorAssignmentRepo: Repository<TranslatorAssignment>,
    @InjectRepository(Series)
    private seriesRepo: Repository<Series>,
    @InjectRepository(Chapter)
    private chapterRepo: Repository<Chapter>,
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

    // Return translator with password for admin to share
    return {
      ...translator,
      password: generatedPassword,
    };
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

  async getTranslators() {
    const translators = await this.userService.findMany({
      where: { role: Role.TRANSLATOR },
      relations: ["seriesAssignments"],
    });

    // Get statistics for each translator
    const translatorsWithStats = await Promise.all(
      translators.map(async (translator) => {
        const assignments = await this.translatorAssignmentRepo.find({
          where: { translatorId: translator.id },
          relations: ["series"],
        });

        // Get series IDs from assignments that have been created
        const seriesIds = assignments
          .filter((a) => a.isSeriesCreated && a.series)
          .map((a) => a.series.id);

        let chaptersTranslated = 0;
        if (seriesIds.length > 0) {
          const chapters = await this.chapterRepo.find({
            where: { seriesId: In(seriesIds) },
          });
          chaptersTranslated = chapters.length;
        }

        return {
          id: translator.id,
          username: translator.username,
          email: translator.email,
          status: translator.deletedAt ? "suspended" : "active",
          assignedSeries: assignments.length,
          chaptersTranslated,
          joinedDate: translator.createdAt.toISOString().split("T")[0],
        };
      }),
    );

    return translatorsWithStats;
  }

  async getSeries() {
    const series = await this.seriesRepo.find({
      relations: ["categories", "chapters"],
    });

    // Get assignments separately to get translator info
    const assignmentIds = series.map((s) => s.assignmentId).filter(Boolean);
    const assignments =
      assignmentIds.length > 0
        ? await this.translatorAssignmentRepo.find({
            where: { id: In(assignmentIds) },
            relations: ["translator"],
          })
        : [];

    const assignmentMap = new Map(assignments.map((a) => [a.id, a]));

    return series.map((s) => {
      const assignment = s.assignmentId
        ? assignmentMap.get(s.assignmentId)
        : null;
      return {
        id: s.id,
        title: s.title,
        cover: s.featuredImage || "/placeholder.svg",
        totalChapters: s.chapters?.length || 0,
        status: s.status,
        translator: assignment?.translator?.username || null,
        categories: s.categories?.map((c) => c.name) || [],
      };
    });
  }

  async toggleTranslatorStatus(translatorId: string) {
    const translator = await this.userService.findOne({
      where: { id: translatorId, role: Role.TRANSLATOR },
    });

    if (!translator)
      throw new NotFoundException("Translator with this ID not found");

    if (translator.deletedAt) {
      // Activate: restore soft-deleted user
      await this.userService.updateUser(translatorId, { deletedAt: null });
    } else {
      // Suspend: soft-delete user
      await this.userService.updateUser(translatorId, {
        deletedAt: new Date(),
      });
    }

    return { message: "Translator status updated successfully" };
  }

  async deleteTranslator(translatorId: string) {
    const translator = await this.userService.findOne({
      where: { id: translatorId, role: Role.TRANSLATOR },
    });

    if (!translator)
      throw new NotFoundException("Translator with this ID not found");

    // Hard delete (permanent removal)
    await this.userService.updateUser(translatorId, {
      deletedAt: new Date(),
    });

    return { message: "Translator deleted successfully" };
  }

  async deleteSeries(seriesId: string) {
    const series = await this.seriesRepo.findOne({
      where: { id: seriesId },
    });

    if (!series) {
      throw new NotFoundException("Series not found");
    }

    // Soft delete all chapters associated with this series (only non-deleted ones)
    const chapters = await this.chapterRepo.find({
      where: { seriesId },
    });

    if (chapters.length > 0) {
      await this.chapterRepo.softRemove(chapters);
    }

    // Soft delete the series
    await this.seriesRepo.softRemove(series);

    return { message: "Series deleted successfully" };
  }
}
