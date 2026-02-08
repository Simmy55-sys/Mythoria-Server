import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import {
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Guild,
  PermissionsBitField,
  TextChannel,
} from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { DISCORD_BOT_TOKEN, DISCORD_GUILD_ID } from "src/config/env";
import { ConfigService } from "@nestjs/config";
import { registerHandlers } from "./handlers";
import { registerCommands } from "./commands";
import configs from "./configs";
import { Series } from "src/model/series.entity";
import { Repository } from "typeorm";
import {
  buildSubscribeCommand,
  buildUnsubscribeCommand,
} from "./commands/builder/subscribe";

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Client;
  private readonly logger = new Logger(BotService.name);

  constructor(
    private configService: ConfigService,
    @InjectRepository(Series) private seriesRepo: Repository<Series>,
  ) {}

  async onModuleInit() {
    this.bot = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.bot.once(Events.ClientReady, async () => {
      this.logger.log(`Logged in as ${this.bot.user?.tag}`);
      await this.registerSlashCommands();
    });

    registerCommands();
    registerHandlers(this.bot, this);

    this.bot.login(this.configService.getOrThrow<string>(DISCORD_BOT_TOKEN));
  }

  private async registerSlashCommands() {
    try {
      const token = this.configService.getOrThrow<string>(DISCORD_BOT_TOKEN);
      const guildId = this.configService.getOrThrow<string>(DISCORD_GUILD_ID);
      const app = await this.bot.application?.fetch();
      if (!app?.id) {
        this.logger.warn(
          "Could not fetch application id; skipping command registration",
        );
        return;
      }
      const rest = new REST().setToken(token);
      const body = [buildSubscribeCommand(), buildUnsubscribeCommand()];
      await rest.put(Routes.applicationGuildCommands(app.id, guildId), {
        body,
      });
      this.logger.log("Registered /subscribe and /unsubscribe commands");
    } catch (err) {
      this.logger.warn(
        `Failed to register slash commands: ${(err as Error).message}`,
      );
    }
  }

  /** Series that have a Discord role (for subscribe/unsubscribe). */
  async getSeriesWithRoles(
    search?: string,
  ): Promise<{ title: string; roleId: string }[]> {
    const qb = this.seriesRepo
      .createQueryBuilder("s")
      .select(["s.title", "s.roleId"])
      .where("s.roleId IS NOT NULL")
      .andWhere("s.deletedAt IS NULL");
    if (search && search.trim()) {
      qb.andWhere("LOWER(s.title) LIKE LOWER(:search)", {
        search: `%${search.trim()}%`,
      });
    }
    qb.orderBy("s.title", "ASC");
    const rows = await qb.getMany();
    return rows.filter((r) => r.roleId) as { title: string; roleId: string }[];
  }

  async createTextChannel(name: string, categoryId?: string) {
    const guild = await this.bot.guilds.fetch(
      this.configService.getOrThrow<string>(DISCORD_GUILD_ID),
    );
    if (!guild) return;

    const category = categoryId
      ? await this.getCategory(categoryId, guild)
      : undefined;

    const channel = await guild.channels.create({
      name,
      type: ChannelType.GuildText,
      ...(category ? { parent: category.id } : {}),
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionsBitField.Flags.SendMessages],
          allow: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: this.bot.user?.id ?? "",
          allow: [
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ViewChannel,
          ],
        },
      ],
    });

    return channel;
  }

  async getCategory(name: string, guild: Guild) {
    return guild.channels.cache.find(
      (channel) =>
        channel.name === name && channel.type === ChannelType.GuildCategory,
    );
  }

  /**
   * Create a mentionable Discord role for the series (e.g. for opt-in notifications).
   * Role name is sanitized and truncated to Discord limit (100 chars).
   */
  async createRole(name: string): Promise<{ id: string } | null> {
    try {
      const guild = await this.bot.guilds.fetch(
        this.configService.getOrThrow<string>(DISCORD_GUILD_ID),
      );
      if (!guild) return null;

      const sanitized = name.replace(/[^\w\s-]/g, "").trim() || "Series";
      const roleName =
        sanitized.length > 100 ? sanitized.slice(0, 97) + "..." : sanitized;

      const role = await guild.roles.create({
        name: roleName,
        mentionable: true,
      });
      return { id: role.id };
    } catch (err) {
      this.logger.warn(
        `Failed to create Discord role: ${(err as Error).message}`,
      );
      return null;
    }
  }

  async sendMessage(channelId: string, message: string) {
    const guild = await this.bot.guilds.fetch(
      this.configService.getOrThrow<string>(DISCORD_GUILD_ID),
    );
    if (!guild) return;

    const channel = await guild.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) return;

    await (channel as TextChannel).send(message);
  }

  async sendEmbedMessage(
    channelId: string,
    embed: EmbedBuilder,
    options?: { roleId?: string },
  ) {
    const guild = await this.bot.guilds.fetch(
      this.configService.getOrThrow<string>(DISCORD_GUILD_ID),
    );
    if (!guild) return;

    const channel = await guild.client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) return;

    const content = options?.roleId ? `<@&${options.roleId}>` : undefined;
    await (channel as TextChannel).send({
      ...(content ? { content } : {}),
      embeds: [embed],
    });
  }

  getConfig() {
    return configs;
  }
}
