import { Snowflake, messageLink, roleMention, userMention } from 'discord.js';

export const ticketPromptDescription = (multi = false) =>
  `${multi ? 'Select a crew that will receive your ticket' : 'Create a ticket by clicking the button below'}. If you are unsure then ask for help in any channel.`;

export const ticketTriageMessage = (member: Snowflake, role: Snowflake) => `
Welcome to our ticket system ${userMention(member)}. The members of our ${roleMention(role)} crew will be along as soon as possible to review your request. In the meanwhile, please make sure that you review the following instructions:

- You may be required to provide resources for us to complete this ticket. When the ticket is complete, please post proof, such as a screenshot, or ask the member who completed the request to post information so the ticket can be closed.
- Crew members can accept or decline the ticket using the controls provided.
- Once accepted, crew members can update the ticket using the buttons which will inform you of any progress, for example: when your request has been started if you are waiting in a queue.
- Only once a request is **completed, delivered, and proof is posted to this channel** should the ticket be marked as _Done_.
- At any point if you no longer need this ticket then you can close the ticket yourself by clicking the _Close_ button below.
- If the ticket is left unattended then it will be closed to keep our work area clean.
`;

export const newTicketMessage = (body: string, member: Snowflake, role: Snowflake) => `
${roleMention(role)} here is a new ticket from ${userMention(member)}. Please see details below.

${body}
`;

export const proxyTicketMessage = (
  body: string,
  member: Snowflake,
  author: Snowflake,
  channel: Snowflake,
  message: Snowflake,
) =>
  `
This ticket was created by ${userMention(member)} on behalf of ${userMention(author)} from this message: ${messageLink(channel, message)}.

${
  body &&
  body
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
}
`.trim();
