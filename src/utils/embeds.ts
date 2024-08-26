import { Colors, EmbedBuilder, EmbedData } from 'discord.js';

export class Embeds {
  static Success(title: string, embed: Omit<EmbedData, 'title'> = {}, emoji = '✅') {
    return new EmbedBuilder({
      color: Colors.DarkGreen,
      ...embed,
      title: `${emoji} ${title}`,
    });
  }
}
