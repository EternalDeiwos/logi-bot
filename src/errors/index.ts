import { ErrorBase, ErrorBaseFactory } from './base.error';
import { DiscordEmbeddableError, DiscordEmbeddableErrorFactory } from './embeddable.error';
import { HowReportBugField, OptionSelectHelpField } from './error.fields';
export { ErrorBase, ErrorBaseFactory };
export { DiscordEmbeddableError, DiscordEmbeddableErrorFactory };

export const InternalError = DiscordEmbeddableErrorFactory('InternalError', {
  INTERNAL_SERVER_ERROR: {
    title: '⚠️🔥 Internal Server Error',
    message: `Something went wrong on our side.`,
    fields: [
      {
        name: 'What happened?',
        value: `You probably haven't done anything wrong but nobody should see this message, and seeing it means something is wrong or at least part of the bot is offline and we might not be aware of it. Please read the instructions below on how to report this.`,
      },
      {
        name: 'What can I do?',
        value: `Please report this as a new bug. The problem may also fix itself with time, so you could also try again in a few minutes; if it does start working again then please mention this in your bug report as well.`,
      },
      HowReportBugField,
    ],
  }, // Unhandled infrastructure failure
  OFFLINE_ERROR: {
    title: '🛠️ Bot Offline',
    message: `At least part of our service is offline.`,
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
    message: `If you weren't expecting to see this then please report it.`,
    fields: [HowReportBugField],
  },
});

export const AuthError = DiscordEmbeddableErrorFactory('AuthError', {
  FORBIDDEN: {
    title: '🔒 Access Denied',
    message: 'You do not have access.',
    fields: [
      {
        name: `I should be able to access this!`,
        value: `If you should have access then ask a Guild Admin to check your privileges and try again. If you still do not have access then you may have discovered a new bug. Please read the instructions below on how to report this.`,
      },
      HowReportBugField,
    ],
  },
});

export const ValidationError = DiscordEmbeddableErrorFactory('ValidationError', {
  MALFORMED_INPUT: {
    title: '📝 Input Missing',
    message: 'One or more required fields are missing.',
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

export const ApiError = ErrorBaseFactory('ApiError', {
  CLAPFOOT: 'Failed to access the war api',
  CATALOG: 'Failed to retrieve catalog document',
  DISCORD: 'Rejected',
});

type DatabaseErrorName = 'QUERY_FAILED';
export class DatabaseError extends ErrorBase<DatabaseErrorName> {}
