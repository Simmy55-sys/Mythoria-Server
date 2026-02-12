import { ChatInputCommandInteraction, GuildMember } from "discord.js";
import { SERIES_OPTION_NAME } from "../builder/subscribe";

export default {
  data: {
    name: "unsubscribe",
  },
  async execute(interaction: ChatInputCommandInteraction) {
    const { options } = interaction;

    const roleId = options.getString(SERIES_OPTION_NAME);
    if (!roleId) {
      await interaction.reply({
        content: "Please select a series.",
        ephemeral: true,
      });
      return;
    }

    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
      return;
    }

    const member = interaction.member;
    if (!member || !("roles" in member)) {
      await interaction.reply({
        content: "Could not resolve your roles.",
        ephemeral: true,
      });
      return;
    }

    const role = await guild.roles.fetch(roleId).catch(() => null);
    if (!role) {
      await interaction.reply({
        content: "That series role is no longer available.",
        ephemeral: true,
      });
      return;
    }

    const hasRole = (member as GuildMember).roles.cache.has(roleId);
    if (!hasRole) {
      await interaction.reply({
        content: "You weren't subscribed to this series.",
        ephemeral: true,
      });
      return;
    }
    await (member as GuildMember).roles.remove(roleId);
    await interaction.reply({
      content: `You've unsubscribed from **${role.name}**.`,
      ephemeral: true,
    });
  },
};
