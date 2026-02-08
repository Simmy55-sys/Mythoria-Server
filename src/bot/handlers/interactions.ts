import { Interaction } from "discord.js";
import { commands } from "../commands";
import { SERIES_OPTION_NAME } from "../commands/builder/subscribe";
import { BotService } from "../bot.service";

export default {
  name: "interactionCreate",
  async execute(botService: BotService, interaction: Interaction) {
    if (interaction.isAutocomplete()) {
      const focused = interaction.options.getFocused(true);
      if (focused.name !== SERIES_OPTION_NAME) return;
      const seriesList = await botService.getSeriesWithRoles(
        focused.value || "",
      );
      await interaction.respond(
        seriesList.slice(0, 25).map((s) => ({
          name: s.title.length > 100 ? s.title.slice(0, 97) + "..." : s.title,
          value: s.roleId!,
        })),
      );
      return;
    }
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    await command.execute(interaction, botService);
  },
};
