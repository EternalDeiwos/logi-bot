import { Snowflake, roleMention, userMention } from 'discord.js';

export const ticketPromptDescription = () =>
  `Select a crew that will receive your ticket. If you are unsure then ask for help in any channel.`;

export const ticketTriageMessage = (member: Snowflake, role: Snowflake) => `
Welcome to the WLL ticket system ${userMention(member)}. Could you please make sure that you have provided the following details in your request:

- Who are you affiliated with? (if applicable)
- What do you need? Provide exact numbers or at least estimates where applicable.
- Where is it needed?
- When do you need it by?

The ${roleMention(role)} team will triage this request. You will be notified of any changes.
`;

export const newTicketMessage = (body: string, member: Snowflake, role: Snowflake) => `
${roleMention(role)} here is a new ticket from ${userMention(member)}. Please see details below.

${body}
`;
