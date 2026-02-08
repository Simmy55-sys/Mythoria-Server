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

const { bulkCreated: CHAPTER_BULK_CREATED } = events.chapter;

export class ChapterBulkCreatedEvent {
  constructor(
    public readonly chapters: Chapter[],
    public readonly seriesId: string,
  ) {}
}

@Injectable()
export class ChapterBulkCreatedSubscriber {
  private readonly logger = new Logger(ChapterBulkCreatedSubscriber.name);

  constructor(
    private readonly botService: BotService,
    @InjectRepository(Series) private readonly seriesRepo: Repository<Series>,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(CHAPTER_BULK_CREATED)
  async handleChapterBulkCreated(event: ChapterBulkCreatedEvent) {
    const { chapters, seriesId } = event;

    if (chapters.length === 0) return;

    this.logger.log(
      `Bulk chapters created: ${chapters.length} chapter(s) (series ${seriesId})`,
    );

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
        `Series not found for bulk chapter notification: ${seriesId}`,
      );
      return;
    }

    const { slug, title: seriesTitle, channelColor } = series;
    const baseUrl = this.configService.getOrThrow<string>(CLIENT_BASE_URL);
    const seriesUrl = `https://${baseUrl}/series/${slug}`;
    const color = channelColor ? parseInt(channelColor, 10) : 0x5865f2;

    const sorted = [...chapters].sort(
      (a, b) => a.chapterNumber - b.chapterNumber,
    );
    const chapterNumbers = sorted.map((ch) => ch.chapterNumber);
    const count = chapterNumbers.length;
    const chaptersLabel =
      count === 1
        ? `Chapter ${chapterNumbers[0]}`
        : `Chapters ${chapterNumbers.join(", ")}`;

    const chapterList = sorted
      .map(
        (ch) =>
          `[${ch.chapterNumber}. ${ch.title}](${baseUrl}/series/${slug}/chapter/${ch.id})`,
      )
      .join(" • ");

    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle("📚 New Chapters Uploaded!")
      .setDescription(
        `**${chaptersLabel}** of **${seriesTitle}** ${count === 1 ? "is" : "are"} now available.`,
      )
      .addFields({
        name: "Read",
        value:
          chapterList.length > 1024
            ? `[View all chapters](${seriesUrl})`
            : chapterList,
      })
      .addFields({
        name: "Series",
        value: `[View ${seriesTitle}](${seriesUrl})`,
      })
      .addFields({
        name: "Get notified",
        value:
          "Use **/subscribe** in this server to opt in for this series, or **/unsubscribe** to stop.",
      })
      .setTimestamp();

    await this.botService.sendEmbedMessage(
      seriesUpdateChannelId,
      embed,
      series.roleId ? { roleId: series.roleId } : undefined,
    );
  }
}
