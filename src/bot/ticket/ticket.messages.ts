import { Snowflake, messageLink, roleMention, userMention } from 'discord.js';

export const ticketPromptDescription = (multi = false) =>
  `${multi ? 'Select a crew that will receive your ticket' : 'Create a ticket by clicking the button below'}. Please be patient for a member to discuss the ticket with you. If you are unsure of how to fill in a ticket then ask for help in any channel.`;

export const ticketPromptTriageHelp = () =>
  `Your ticket will first be sent to Triage where it will be evaluated and assigned to a relevant crew. Once the ticket is assigned, then a member of the crew will evaluate the request and accept or decline it. If we cannot meet your request exactly (e.g. if there is a queue) then we will let you know about adjustments in the ticket.`;

export const ticketPromptCrewJoinInstructions = () =>
  `Crews are groups of players dedicated to one particular task or facility. Each crew has their own channel and anyone can join a crew using the _Join_ button pinned in the relevant channel or using the \`/echo crew join\` slash command. Any crew member may accept or decline tickets for the crew.`;

export const ticketPromptStatusInstructions = () =>
  `You can view the current status and a summary of open tickets for all crews by running the \`/echo crew status\` slash command in any secure channel.`;

export const ticketPromptCrewCreateInstructions = () => `
Any verified members may create a crew using the slash command \`/echo crew create\` and providing the necessary options:
- \`name\` is the display name of the crew as it will appear in selection lists.
- \`name_short\` a unique short name for the crew that will be used in forum tags and other space-constrained interfaces. Must be less than 20 characters long.

Once your crew channel has been created, check the prompt for further instructions.
`;

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
