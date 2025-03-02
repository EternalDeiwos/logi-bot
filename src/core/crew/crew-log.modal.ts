import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Crew } from './crew.entity';

export class CrewLogModalBuilder extends ModalBuilder {
  addForm(crew: Crew) {
    const log = new TextInputBuilder()
      .setCustomId('crew/log/content')
      .setLabel('Crew Status')
      .setPlaceholder(
        'This will replace the last log on status updates so please keep it relevant.',
      )
      .setStyle(TextInputStyle.Paragraph);

    return this.setCustomId(`crew/log/${crew.id}`)
      .setTitle('New Crew Log')
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(log));
  }
}
