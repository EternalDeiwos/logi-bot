import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { CurrentCounter } from 'src/inventory/counter/counter.entity';

export class CounterUpdateModalBuilder extends ModalBuilder {
  addForm(counters: CurrentCounter[]) {
    for (const c of counters) {
      // const material = c.expandedCatalog ? `: ${c.expandedCatalog.displayName} ` : '';
      const counter = new TextInputBuilder()
        .setCustomId(c.id)
        .setLabel(c.expandedCatalog ? c.expandedCatalog.displayName : `${c.name} (${c.kind})`)
        .setValue(c.value.toString())
        .setStyle(TextInputStyle.Short);

      this.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(counter));
    }

    return this.setCustomId(`counter/update`).setTitle('Update Counters');
  }
}
