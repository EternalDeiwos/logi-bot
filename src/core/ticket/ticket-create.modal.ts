import {
  ActionRowBuilder,
  messageLink,
  ModalBuilder,
  Snowflake,
  TextInputBuilder,
  TextInputStyle,
  userMention,
} from 'discord.js';
import { SelectCrew } from 'src/core/crew/crew.entity';

type TicketFormFields = 'title' | 'what' | 'where' | 'when';
type TicketFormProperties = { [K in TicketFormFields]?: { emoji?: string; value?: string } };

export class TicketCreateModalBuilder extends ModalBuilder {
  static makeProxyTicketMessage(
    body: string,
    memberSf: Snowflake,
    authorSf: Snowflake,
    channelSf: Snowflake,
    messageSf: Snowflake,
  ) {
    return `
This ticket was created by ${userMention(memberSf)} on behalf of ${userMention(authorSf)} from this message: ${messageLink(channelSf, messageSf)}.

${
  body &&
  body
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
}
`.trim();
  }

  addForm(crewRef: SelectCrew, { title, what, where, when }: TicketFormProperties = {}) {
    const titleInput = new TextInputBuilder()
      .setCustomId('ticket/form/title')
      .setLabel((title?.emoji ? `${title.emoji} ` : '') + 'Title')
      .setPlaceholder('Summary of your request')
      .setValue(title?.value || '')
      .setStyle(TextInputStyle.Short);

    const whatInput = new TextInputBuilder()
      .setCustomId('ticket/form/what')
      .setLabel((what?.emoji ? `${what.emoji} ` : '') + 'What do you need?')
      .setPlaceholder(
        'Please be as detailed as possible and use exact quantities to prevent delays.',
      )
      .setValue(what?.value || '')
      .setStyle(TextInputStyle.Paragraph);

    const whereInput = new TextInputBuilder()
      .setCustomId('ticket/form/where')
      .setLabel((where?.emoji ? `${where.emoji} ` : '') + 'Where do you need it?')
      .setValue(where?.value || 'We will fetch it when it is done')
      .setStyle(TextInputStyle.Paragraph);

    const whenInput = new TextInputBuilder()
      .setCustomId('ticket/form/when')
      .setLabel((when?.emoji ? `${when.emoji} ` : '') + 'When do you need it?')
      .setValue(when?.value || 'ASAP')
      .setStyle(TextInputStyle.Short);

    return this.setCustomId(`ticket/create/${crewRef.crewSf}`)
      .setTitle('Create a Ticket')
      .addComponents(
        [titleInput, whatInput, whereInput, whenInput].map((input) =>
          new ActionRowBuilder<TextInputBuilder>().addComponents(input),
        ),
      );
  }
}
