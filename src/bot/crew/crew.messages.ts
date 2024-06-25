import { Snowflake, userMention } from 'discord.js';
import { Crew } from './crew.entity';

export const newCrewMessage = (memberRef: Snowflake) =>
  `Welcome to your new crew. This crew is led by ${userMention(memberRef)} and you can join by clicking the button below. You can leave again at any time by running the \`/echo crew leave\` command in this channel or optionally selecting the team in the command.
  
To run a successful crew you should do the following:
- Post a log (command or button) describing your goals. You should communicate what you are doing or a description of the crew, where you are doing it, necessary inputs, and outputs.
- Share any designs or plans in the channel for discussion.
- Advertise your crew elsewhere in the Discord so others can know to join you.
- Continue to provide updates (or logs) as goals are complete or new goals are created.`;

export const crewAuditPrompt = (crew: Crew) =>
  `A new crew called **${crew.name}** was created under ${crew.team.name} by ${userMention(crew.createdBy)}. This prompt can be used to remove the team if there is something wrong.`;
