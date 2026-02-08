import { SlashCommandBuilder } from "@discordjs/builders";

const SERIES_OPTION_NAME = "series";

export function buildSubscribeCommand() {
  return new SlashCommandBuilder()
    .setName("subscribe")
    .setDescription(
      "Opt in to get notified when a series has new chapters or updates",
    )
    .addStringOption((option) =>
      option
        .setName(SERIES_OPTION_NAME)
        .setDescription("Series to subscribe to")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .toJSON();
}

export function buildUnsubscribeCommand() {
  return new SlashCommandBuilder()
    .setName("unsubscribe")
    .setDescription("Opt out of notifications for a series")
    .addStringOption((option) =>
      option
        .setName(SERIES_OPTION_NAME)
        .setDescription("Series to unsubscribe from")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .toJSON();
}

export { SERIES_OPTION_NAME };
