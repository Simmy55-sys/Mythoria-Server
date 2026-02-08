import { ChatInputCommandInteraction } from "discord.js";

export interface Command {
  data: any; // SlashCommandBuilder
  execute(interaction: ChatInputCommandInteraction): Promise<void>;
}
