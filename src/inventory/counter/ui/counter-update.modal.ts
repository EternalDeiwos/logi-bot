import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { CounterKind, CurrentCounter } from 'src/inventory/counter/counter.entity';

export class CounterUpdateModalBuilder extends ModalBuilder {
  addForm(counters: CurrentCounter[]) {
    for (const c of counters) {
      const label = [c.expandedCatalog ? c.expandedCatalog.displayName : c.name];

      if (!c.expandedCatalog && c.kind !== CounterKind.SIMPLE) {
        label.push(`(${c.kind})`);
      }

      const counter = new TextInputBuilder()
        .setCustomId(c.id)
        .setLabel(label.join(' '))
        .setValue(c.value.toString())
        .setStyle(TextInputStyle.Short);

      this.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(counter));
    }

    return this.setCustomId(`counter/update`).setTitle('Update Counters');
  }
}
