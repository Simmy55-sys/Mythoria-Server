import { Collection, Client } from "discord.js";
import handlers from "./handler";

export const commands = new Collection<string, any>();

export async function registerCommands() {
  const actions = ["subscribe", "unsubscribe"]; // auto-load later

  for (const action of actions) {
    const command = handlers[action];
    commands.set(command.data.name, command);
  }
}
