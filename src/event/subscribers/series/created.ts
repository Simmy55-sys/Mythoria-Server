import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { EmbedBuilder } from "discord.js";
import { BotService } from "src/bot/bot.service";
import events from "src/event";
import { Series } from "src/model/series.entity";
import { Repository } from "typeorm";
import { CLIENT_BASE_URL } from "src/config/env";

const { created: SERIES_CREATED } = events.series;
const SERIES_COLORS = [
  0x57f287, // green
  0x5865f2, // blurple
  0xf1c40f, // gold
  0xe74c3c, // red
  0x9b59b6, // purple
] as const;

function getSeriesColor(): number {
  return SERIES_COLORS[Math.floor(Math.random() * SERIES_COLORS.length)];
}

export class SeriesCreatedEvent {
  constructor(
    public readonly series: Series,
    public readonly channelIds: {
      general: string;
      series?: string;
    },
    public readonly translator: string,
  ) {}
}

@Injectable()
export class SeriesCreatedSubscriber {
  private readonly logger = new Logger(SeriesCreatedSubscriber.name);
  constructor(
    private readonly botService: BotService,
    @InjectRepository(Series) private readonly seriesRepo: Repository<Series>,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent(SERIES_CREATED)
  async handleSeriesCreated(event: SeriesCreatedEvent) {
    const {
      series: { title, author, featuredImage, categories, slug },
      translator,
    } = event;
    this.logger.log(`Series created: ${title}`);
    const { general: generalChannelId, series } = event.channelIds;

    // Create a text channel for the series using channelID if exists else create a new one and Send a message to the general channel
    const seriesColor = getSeriesColor(); // random color from the SERIES_COLORS array
    let seriesChannelId = event.channelIds.series;

    // Save credentials to the series Model
    const savedSeries = await this.seriesRepo.findOne({
      where: { slug },
    });

    if (!savedSeries) {
      this.logger.error(`Series not found: ${slug}`);
      return;
    }

    if (!seriesChannelId) {
      // Create a new text channel for the series
      seriesChannelId = (await this.botService.createTextChannel(title))?.id;
      savedSeries.channelId = seriesChannelId;
    }

    savedSeries.channelColor = seriesColor.toString();

    const role = await this.botService.createRole(title);
    if (role) {
      savedSeries.roleId = role.id;
    }

    await this.seriesRepo.save(savedSeries);

    const config = this.botService.getConfig();
    const seriesUpdateChannelId = (config as { seriesUpdateChannel?: string })
      ?.seriesUpdateChannel;

    // #### General Channel Embed Message ####
    const embeddedMsgGeneral = new EmbedBuilder()
      .setColor(seriesColor)
      .setTitle("🆕 New Novel Series Launched!")
      .setDescription(`**${title}**\n\n Author: **${author}**`)
      .setThumbnail(featuredImage)
      .addFields(
        {
          name: "Genre",
          value: categories.map((category) => category.name).join(" • "),
        },
        { name: "Translator", value: `@${translator}` },
        {
          name: "Start Reading",
          value: `[Read Chapter 1](${this.configService.getOrThrow<string>(CLIENT_BASE_URL)}/series/${slug})`,
        },
        {
          name: "📌 Series update notifications",
          value: seriesUpdateChannelId
            ? `Get notified in <#${seriesUpdateChannelId}> for new chapters and updates. Use **/subscribe** in this server to opt in, or **/unsubscribe** to stop.`
            : "New chapters will be announced in the series update channel. Use **/subscribe** to opt in, **/unsubscribe** to stop.",
        },
      )
      .setTimestamp();

    await this.botService.sendEmbedMessage(
      generalChannelId,
      embeddedMsgGeneral,
    );
  }
}
