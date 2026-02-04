import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Client, GatewayIntentBits } from "discord.js";
import { DISCORD_BOT_TOKEN } from "src/config/env";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Client;
  private logger = new Logger(BotService.name);

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.bot = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.bot.on("clientReady", () => {
      this.logger.log(`Logged in as ${this.bot.user?.tag}`);
    });

    // Login to Discord
    this.bot.login(this.configService.getOrThrow<string>(DISCORD_BOT_TOKEN));
  }
}
