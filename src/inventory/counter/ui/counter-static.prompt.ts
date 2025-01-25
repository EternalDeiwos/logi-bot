import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors,
  EmbedBuilder,
  EmbedData,
} from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { CounterKind, CurrentCounter } from 'src/inventory/counter/counter.entity';

export class CounterStaticUpdatePromptBuilder extends BasePromptBuilder {
  addCounter(counter: CurrentCounter, options: EmbedData = {}) {
    const title = [counter.crewId ? `${counter.crew.name}: ${counter.name}` : counter.name];
    const description = [`# ${counter.value.toString()}`];

    if (counter.kind !== CounterKind.SIMPLE) {
      title.push(`(${counter.kind})`);
    }

    if (counter.expandedCatalog) {
      description.push(`### ${counter.expandedCatalog.displayName}`);
    }

    const embed = new EmbedBuilder({
      color: counter.kind === CounterKind.KILL ? Colors.DarkRed : Colors.DarkGreen,
      ...options,
    })
      .setTimestamp()
      .setTitle(title.join(' '))
      .setDescription(description.join('\n\n'));

    return this.add({ embeds: [embed] });
  }

  addUpdateControls(crewId: string) {
    const update = new ButtonBuilder()
      .setCustomId(`counter/update/${crewId}`)
      .setLabel('Update')
      .setStyle(ButtonStyle.Primary);

    return this.add({
      components: [new ActionRowBuilder<ButtonBuilder>().addComponents(update)],
    });
  }
}
