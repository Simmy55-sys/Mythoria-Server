import { Collection, Client } from "discord.js";

export const commands = new Collection<string, any>();

export async function registerCommands() {
  const files = ["subscribe", "unsubscribe"]; // auto-load later

  for (const file of files) {
    const command = await require(`./${file}.command`).default;
    commands.set(command.data.name, command);
  }
}
