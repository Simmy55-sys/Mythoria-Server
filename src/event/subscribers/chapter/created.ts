import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { EmbedBuilder } from "discord.js";
import { BotService } from "src/bot/bot.service";
import events from "src/event";
import { Series } from "src/model/series.entity";
import { Chapter } from "src/model/chapter.entity";
import { Repository } from "typeorm";
import { CLIENT_BASE_URL } from "src/config/env";

const { created: CHAPTER_CREATED } = events.chapter;

export class ChapterCreatedEvent {
  constructor(
    public readonly chapter: Chapter,
    public readonly seriesId: string,
  ) {}
}

@Injectable()
export class ChapterCreatedSubscriber {
  private readonly logger = new Logger(ChapterCreatedSubscriber.name);

  constructor(
    private readonly botService: BotService,
    @InjectRepository(Series) private readonly seriesRepo: Repository<Series>,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(CHAPTER_CREATED)
  async handleChapterCreated(event: ChapterCreatedEvent) {
    const { chapter, seriesId } = event;
    const { title, chapterNumber } = chapter;

    this.logger.log(`Chapter created: ${title} (series ${seriesId})`);

    const config = this.botService.getConfig();
    const seriesUpdateChannelId = (config as { seriesUpdateChannel?: string })
      ?.seriesUpdateChannel;
    if (!seriesUpdateChannelId) {
      this.logger.warn(
        "seriesUpdateChannel not configured; skipping notification",
      );
      return;
    }

    const series = await this.seriesRepo.findOne({
      where: { id: seriesId },
    });
    if (!series) {
      this.logger.warn(
        `Series not found for chapter notification: ${seriesId}`,
      );
      return;
    }

    const { slug, title: seriesTitle, channelColor } = series;
    const baseUrl = this.configService.getOrThrow<string>(CLIENT_BASE_URL);
    const chapterUrl = `${baseUrl}series/${slug}/chapter/${chapter.id}`;
    const seriesUrl = `${baseUrl}series/${slug}`;
    const color = channelColor ? parseInt(channelColor, 10) : 0x5865f2;

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("📖 New Chapter Released!")
      .setDescription(`**${seriesTitle}**`)
      .addFields(
        {
          name: "Chapter",
          value: `**${chapterNumber}. ${title}**`,
        },
        {
          name: "Read now",
          value: `[Chapter ${chapterNumber}](${chapterUrl}) • [Series](${seriesUrl})`,
        },
        {
          name: "Get notified",
          value:
            "Use **/subscribe** in this server to opt in for this series, or **/unsubscribe** to stop.",
        },
      )
      .setTimestamp();

    await this.botService.sendEmbedMessage(
      seriesUpdateChannelId,
      embed,
      series.roleId ? { roleId: series.roleId } : undefined,
    );
  }
}
