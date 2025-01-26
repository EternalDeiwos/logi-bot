import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  userMention,
} from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { CrewMember } from './member/crew-member.entity';
import { Crew } from './crew.entity';
import { CrewMemberAccess } from 'src/types';

export const newCrewMessage = (member: string) =>
  `Welcome to your new crew. This crew is led by ${member}. You can join by clicking the button below. You can leave again at any time by running the \`/echo crew leave\` command in this channel or optionally selecting the team in the command.
  
To run a successful crew you should do the following:
- Post a log (command or button) describing your goals. You should communicate what you are doing or a description of the crew, where you are doing it, necessary inputs, and outputs.
- Share any designs or plans in the channel for discussion.
- Advertise your crew elsewhere in the Discord so others can know to join you.
- Continue to provide updates (or logs) as goals are complete or new goals are created.`;

export class CrewInfoPromptBuilder extends BasePromptBuilder {
  public addCrewPromptMessage(crew: Crew, members: CrewMember[]) {
    const owner = members.find((member) => member.access === CrewMemberAccess.OWNER);
    const admins = members.filter((member) => member.access === CrewMemberAccess.ADMIN);
    const embed = new EmbedBuilder()
      .setTitle(`Join ${crew.name}`)
      .setDescription(newCrewMessage(owner ? userMention(owner.memberSf) : 'nobody'))
      .setColor(Colors.DarkGreen);

    if (admins.length) {
      embed.addFields({
        name: 'Crew Admins',
        value: [owner, ...admins].map((member) => `- ${userMention(member.memberSf)}`).join('\n'),
        inline: false,
      });
    }

    return this.add({ embeds: [embed] });
  }

  public addCrewControls(crew: Crew) {
    const join = new ButtonBuilder()
      .setCustomId(`crew/join/${crew.crewSf}`)
      .setLabel('Join Crew')
      .setStyle(ButtonStyle.Primary);

    const log = new ButtonBuilder()
      .setCustomId('crew/log')
      .setLabel('Log')
      .setStyle(ButtonStyle.Secondary);

    return this.add({
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(join, log)],
    });
  }
}
