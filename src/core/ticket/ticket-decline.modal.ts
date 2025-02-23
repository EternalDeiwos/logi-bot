import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { SelectTicketDto } from './ticket.entity';

export class TicketDeclineModalBuilder extends ModalBuilder {
  addForm(ticketRef: SelectTicketDto) {
    const reason = new TextInputBuilder()
      .setCustomId('ticket/decline/reason')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph);

    return this.setCustomId(`ticket/decline/${ticketRef.threadSf}`)
      .setTitle('Decline Ticket')
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reason));
  }
}
