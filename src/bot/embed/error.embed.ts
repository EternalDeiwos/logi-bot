import { APIEmbedField } from 'discord.js';
import { BaseEmbed } from './factory/embed.factory';

export const HowReportBugField: APIEmbedField = {
  name: 'How do I report a bug?',
  value: `The best way to report a bug is to file a new ticket, or if you can't then to post your bug report in a general channel. Your bug report should contain:\n1. Screenshot(s) of your bug\n2. What you were trying to do\n3. Steps to reproduce — include the options you used and their values\n4. Other relevant information — if you think it is relevant then it probably is`,
};

export const OptionSelectHelpField: APIEmbedField = {
  name: 'Option Selection',
  value: `Sometimes Discord fails to properly select one of the provided options if you use the enter key (⏎) on a keyboard. Try running the command again but either touch your selected option or click it with a mouse.`,
};

export const ErrorEmbed = BaseEmbed.factory({
  INTERNAL_SERVER_ERROR: {
    title: '⚠️🔥 Internal Server Error',
    description: `Something went wrong on our side.`,
    fields: [
      {
        name: 'What happened?',
        value: `You probably haven't done anything wrong but something failed or at least part of the bot is offline and we might not be aware of it. Please read the instructions below on how to report this.`,
      },
      {
        name: 'What can I do?',
        value: `Please report this as a new bug. The problem may also fix itself with time, so you could also try again in a few minutes; if it does start working again then please mention this in your bug report as well.`,
      },
      HowReportBugField,
    ],
  },
  OFFLINE_ERROR: {
    title: '🛠️ Bot Offline',
    description: `At least part of our service is offline.`,
    fields: [
      {
        name: 'What can I do?',
        value: `You can check in any discussion channel if anyone else knows the bot is offline; although chances are we already know about it and are working to fix it. If you don't get a response, or if this is only happening for specific functions then you may have discovered a new bug. Please read the instructions below on how to report this.
        
        Otherwise, please look out for any announcements on the status of the bot and try again later.`,
      },
      HowReportBugField,
    ],
  },
  TEST_ERROR: {
    title: '🧪 Testing',
    description: `If you weren't expecting to see this then please report it.`,
    fields: [HowReportBugField],
  },
  FORBIDDEN: {
    title: '🔒 Access Denied',
    description: 'You do not have access.',
    fields: [
      {
        name: `I should be able to access this!`,
        value: `If you should have access then ask a Guild Admin to check your privileges and try again. If you still do not have access then you may have discovered a new bug. Please read the instructions below on how to report this.`,
      },
      HowReportBugField,
    ],
  },
  MALFORMED_INPUT: {
    title: '📝 Input Missing',
    description: 'One or more required fields are missing.',
    fields: [
      {
        name: 'Troubleshooting',
        value: `Try run your command again paying special attention to your inputs. If you are sure your inputs are all correct then you may have discovered a new bug. Please read the instructions below on how to report this.`,
      },
      OptionSelectHelpField,
      HowReportBugField,
    ],
  },
});
