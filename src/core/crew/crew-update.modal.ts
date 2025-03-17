import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Crew } from './crew.entity';
import { CrewSettingName } from './crew-setting.entity';

export class CrewSettingUpdateModalBuilder extends ModalBuilder {
  forCrew(crew: Crew) {
    return this.setCustomId(`crew/setting/${crew.id}`).setTitle('Update Crew Settings');
  }

  addField(key: CrewSettingName, label: string, value?: string) {
    const field = new TextInputBuilder()
      .setCustomId(`crew/${key}`)
      .setLabel(label)
      .setPlaceholder('Leave blank for default')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(2048);

    if (value) {
      field.setValue(value);
    }

    return this.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(field));
  }
}
