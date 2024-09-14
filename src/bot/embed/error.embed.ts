import { APIEmbedField, Colors } from 'discord.js';
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
    color: Colors.DarkRed,
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
    color: Colors.DarkRed,
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
    color: Colors.DarkRed,
    fields: [HowReportBugField],
  },
  FORBIDDEN: {
    title: '🔒 Access Denied',
    description: 'You do not have access.',
    color: Colors.DarkRed,
    fields: [
      {
        name: `I should be able to access this!`,
        value: `If you should have access then ask a Guild Admin to check your privileges and try again. If you still do not have access then you may have discovered a new bug. Please read the instructions below on how to report this.`,
      },
      HowReportBugField,
    ],
  },
  VALIDATION_FAILED: {
    title: '📝 User Input Error',
    description: 'One or more required fields are missing.',
    color: Colors.DarkRed,
    fields: [
      {
        name: 'Troubleshooting',
        value: `Try run your command again paying special attention to your inputs. If you are sure your inputs are all correct then you may have discovered a new bug. Please read the instructions below on how to report this.`,
      },
      OptionSelectHelpField,
      HowReportBugField,
    ],
  },
  EXTERNAL_ERROR: {
    title: `🤷 External Error`,
    description: 'Something happened outside of our control.',
    color: Colors.DarkRed,
    fields: [
      {
        name: 'What happened?',
        value: `A service that we rely on, e.g. Discord, the Foxhole API, and others, did not handle our request correctly. This could be due to a bug but if it worked before then it is likely something has gone wrong on one of these upstream servics.`,
      },
      {
        name: 'What can I do?',
        value: `Not much... try your command again in a few minutes and hope whatever broke is being fixed. If you don't hear any announcements on the topic and it is still not working after several hours then you can file a new bug ticket.`,
      },
      HowReportBugField,
    ],
  },
  INSUFFICIENT_PRIVILEGES: {
    title: '🤖 Insufficient Privileges',
    description: 'The bot does not have enough access to complete your request',
    color: Colors.DarkRed,
    fields: [
      {
        name: 'What can I do?',
        value:
          'Notify your guild administrators to address this issue. Try to explain what you were trying to do and show them a screenshot of this message.',
      },
      {
        name: `Troubleshooting`,
        value: `A guild administrator should check the following:\n1. The bot requires the manage channel and manage roles privileges to function, among others. Do not remove permissions that the bot needs.\n2. The bot requires access to channels and categories it uses. Make sure that you have granted the appropriate permissions. You do not have to worry about the channels and roles created by the bot as it will ensure those permissions automatically.\n3. Roles managed by the bot must be ordered below the bot role or they cannot be managed, even if the bot has the manage roles permission.`,
      },
    ],
  },
  ERROR_GENERIC: {
    titlePrefix: '🚫',
    color: Colors.DarkRed,
  },
});
