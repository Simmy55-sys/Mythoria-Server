import { Client } from "discord.js";
import { BotService } from "../bot.service";

// Auto register all events handlers

export function registerHandlers(client: Client, botService: BotService) {
  const events = ["interactions", "messages"];

  for (const event of events) {
    const eventFile = require(`./${event}`).default;

    client.on(eventFile.name, (...args) =>
      eventFile.execute(botService, ...args),
    );
  }
}
