import { EmbedField } from 'discord.js';

export const HowReportBugField: EmbedField = {
  name: 'How do I report a bug?',
  value: `The best way to report a bug is to file a new ticket, or if you can't then to post your bug report in a general channel. Your bug report should contain:\n1. Screenshot(s) of your bug\n2. What you were trying to do\n3. Steps to reproduce — please include which specific options you used and their values\n4. Any other information you think should be included — if you think it is relevant then it probably is`,
  inline: false,
};

export const OptionSelectHelpField: EmbedField = {
  name: 'Option Selection',
  value: `Sometimes Discord fails to properly select one of the provided options if you use the enter key (⏎) on a keyboard. Try running the command again but either touch your selected option or click it with a mouse.`,
  inline: false,
};
