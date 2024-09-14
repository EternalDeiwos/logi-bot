import { Colors } from 'discord.js';
import { BaseEmbed } from './factory/embed.factory';

export const PromptEmbed = BaseEmbed.factory({
  PROMPT_GENERIC: {
    color: Colors.DarkGold,
    titlePrefix: '❓',
  },
});
