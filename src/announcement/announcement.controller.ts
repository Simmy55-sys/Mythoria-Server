import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import { AnnouncementService } from "./announcement.service";
import { CreateAnnouncementDto } from "./dto/create-announcement.dto";
import { UpdateAnnouncementDto } from "./dto/update-announcement.dto";
import { IsAuthenticated } from "src/account/guard/is-authenticated.guard";
import { IsAdmin } from "src/account/guard/roles/is-admin.guard";

@Controller("announcement")
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  // Public endpoint for main site
  @Get("public/active")
  async getActiveAnnouncements() {
    return await this.announcementService.findActive();
  }

  // Admin endpoints
  @Post()
  @UseGuards(IsAuthenticated, IsAdmin)
  async create(@Body() createAnnouncementDto: CreateAnnouncementDto) {
    return await this.announcementService.create(createAnnouncementDto);
  }

  @Get()
  @UseGuards(IsAuthenticated, IsAdmin)
  async findAll() {
    return await this.announcementService.findAll();
  }

  @Get(":id")
  @UseGuards(IsAuthenticated, IsAdmin)
  async findOne(@Param("id") id: string) {
    return await this.announcementService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(IsAuthenticated, IsAdmin)
  @HttpCode(200)
  async update(
    @Param("id") id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
  ) {
    return await this.announcementService.update(id, updateAnnouncementDto);
  }

  @Patch(":id/toggle-active")
  @UseGuards(IsAuthenticated, IsAdmin)
  @HttpCode(200)
  async toggleActive(@Param("id") id: string) {
    return await this.announcementService.toggleActive(id);
  }

  @Delete(":id")
  @UseGuards(IsAuthenticated, IsAdmin)
  @HttpCode(200)
  async remove(@Param("id") id: string) {
    return await this.announcementService.remove(id);
  }
}
