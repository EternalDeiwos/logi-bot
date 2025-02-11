import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { SelectCrewDto } from './crew.entity';

export class CrewDeleteModalBuilder extends ModalBuilder {
  addForm(crewRef: SelectCrewDto) {
    const reason = new TextInputBuilder()
      .setCustomId('crew/delete/reason')
      .setLabel('Reason')
      .setStyle(TextInputStyle.Paragraph);

    return this.setCustomId(`crew/delete/${crewRef.crewSf}`)
      .setTitle('Delete Crew')
      .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reason));
  }
}
