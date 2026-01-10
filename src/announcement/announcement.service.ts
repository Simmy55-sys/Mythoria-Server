import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { Announcement } from "src/model/announcement.entity";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";
import BaseService from "src/interface/service/base.service";

@Injectable()
export class AnnouncementService extends BaseService {
  constructor(
    @InjectRepository(Announcement)
    private readonly repo: Repository<Announcement>,
  ) {
    super();
  }

  async create(
    dto: CreateAnnouncementDto,
    transactionalEntity?: EntityManager,
  ) {
    const announcement = this.repo.create({
      title: dto.title,
      content: dto.content,
      type: dto.type || "info",
      isActive: dto.isActive ?? true,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
    });

    return this.performEntityOps<Announcement, Announcement>({
      repositoryManager: this.repo,
      transactionalEntity,
      action: "save",
      opsArgs: [announcement],
    });
  }

  async findAll() {
    const announcements = await this.repo.find({
      order: { createdAt: "DESC" },
    });

    return announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      isActive: announcement.isActive,
      startDate: announcement.startDate.toISOString(),
      endDate: announcement.endDate?.toISOString() || null,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const announcement = await this.repo.findOne({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException("Announcement not found");
    }

    return {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      isActive: announcement.isActive,
      startDate: announcement.startDate.toISOString(),
      endDate: announcement.endDate?.toISOString() || null,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateAnnouncementDto) {
    const announcement = await this.repo.findOne({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException("Announcement not found");
    }

    if (dto.title !== undefined) announcement.title = dto.title;
    if (dto.content !== undefined) announcement.content = dto.content;
    if (dto.type !== undefined) announcement.type = dto.type;
    if (dto.isActive !== undefined) announcement.isActive = dto.isActive;
    if (dto.startDate !== undefined)
      announcement.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined)
      announcement.endDate = dto.endDate ? new Date(dto.endDate) : null;

    await this.repo.save(announcement);

    return {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      isActive: announcement.isActive,
      startDate: announcement.startDate.toISOString(),
      endDate: announcement.endDate?.toISOString() || null,
      createdAt: announcement.createdAt.toISOString(),
      updatedAt: announcement.updatedAt.toISOString(),
    };
  }

  async toggleActive(id: string) {
    const announcement = await this.repo.findOne({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException("Announcement not found");
    }

    announcement.isActive = !announcement.isActive;
    await this.repo.save(announcement);

    return {
      message: `Announcement ${announcement.isActive ? "activated" : "deactivated"}`,
    };
  }

  async remove(id: string) {
    const announcement = await this.repo.findOne({
      where: { id },
    });

    if (!announcement) {
      throw new NotFoundException("Announcement not found");
    }

    await this.repo.remove(announcement);

    return { message: "Announcement deleted successfully" };
  }

  // Public method to get active announcements for the main site
  async findActive() {
    const now = new Date();
    const announcements = await this.repo.find({
      where: {
        isActive: true,
      },
      order: { createdAt: "DESC" },
    });

    // Filter by date range
    return announcements
      .filter((announcement) => {
        const startDate = new Date(announcement.startDate);
        const endDate = announcement.endDate
          ? new Date(announcement.endDate)
          : null;

        // Must have started
        if (startDate > now) return false;

        // If has end date, must not have ended
        if (endDate && endDate < now) return false;

        return true;
      })
      .map((announcement) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        startDate: announcement.startDate.toISOString(),
        endDate: announcement.endDate?.toISOString() || null,
      }));
  }
}
