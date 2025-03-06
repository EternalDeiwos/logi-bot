import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Crew } from './crew.entity';

export class CrewUpdateModalBuilder extends ModalBuilder {
  forCrew(crew: Crew) {
    return this.setCustomId(`crew/update/${crew.id}`).setTitle('Update Crew Settings');
  }

  addTicketHelpField(crew: Crew) {
    const help = new TextInputBuilder()
      .setCustomId('crew/ticket_help')
      .setLabel('Help Text')
      .setPlaceholder('Leave blank for default ticket message')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(2048);

    if (crew.ticketHelpText) {
      help.setValue(crew.ticketHelpText);
    }

    return this.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(help));
  }
}
