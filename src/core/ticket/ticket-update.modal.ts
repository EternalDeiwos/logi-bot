import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Ticket } from './ticket.entity';

export class TicketUpdateModalBuilder extends ModalBuilder {
  forTicket(ticket: Ticket) {
    return this.setCustomId(`ticket/update/${ticket.threadSf}`).setTitle('Update Ticket');
  }

  addTicketNameField(ticket: Ticket) {
    const name = new TextInputBuilder()
      .setCustomId('ticket/name')
      .setLabel('Name')
      .setValue(ticket.name)
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(2048);

    return this.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(name));
  }
}
