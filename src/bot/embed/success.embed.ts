import { Colors } from 'discord.js';
import { BaseEmbed } from './factory/embed.factory';

export const SuccessEmbed = BaseEmbed.factory({
  SUCCESS_GENERIC: {
    color: Colors.DarkGreen,
    titlePrefix: '✅',
  },
});
