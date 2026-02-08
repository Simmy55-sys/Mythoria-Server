import { Message } from "discord.js";
import { BotService } from "../bot.service";

export default {
  name: "messageCreate",
  async execute(botService: BotService, message: Message) {
    // If the message is from a bot, return (prevent infinite loops)
    if (message.author.bot) return;
    if (message.content.startsWith("/")) return;

    // Example hook
    // handleSpoilers(message)
    // handleNSFW(message)
  },
};
