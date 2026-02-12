import { Client } from "discord.js";
import { BotService } from "../bot.service";
import handlers from "./data";

// Auto register all events handlers

export function registerHandlers(client: Client, botService: BotService) {
  const actions = ["interactions", "messages"];

  for (const action of actions) {
    const actionHandler = handlers[action];

    client.on(actionHandler.name, (...args) =>
      actionHandler.execute(botService, ...args),
    );
  }
}
