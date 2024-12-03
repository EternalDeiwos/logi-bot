import { EmbedBuilder, Colors, Collection, ApplicationEmoji, EmbedData } from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { StockpileEntry } from './stockpile-entry.entity';
import { InternalError } from 'src/errors';

const ITEMS_PER_TABLE = 15;
const DEFAULT_EMBED_OPTIONS: EmbedData = {
  title: 'Stockpile',
  color: Colors.DarkGreen,
};

export class StockpileContentPromptBuilder extends BasePromptBuilder {
  constructor(
    private readonly emojis: Collection<string, ApplicationEmoji>,
    ...args: ConstructorParameters<typeof BasePromptBuilder>
  ) {
    super(...args);
  }

  displayFields(entries: StockpileEntry[], options: EmbedData = {}) {
    const embed = new EmbedBuilder({ ...DEFAULT_EMBED_OPTIONS, ...options }).setTimestamp();

    const [name, stockpile, quantity] = entries.reduce(
      (state, e) => {
        // const locationMarkerName = e.log.expandedLocation.hexName
        //   .toLowerCase()
        //   .split(' ')
        //   .concat(e.log.expandedLocation.majorName.toLowerCase().split(' '))
        //   .join('_');

        // const locationMarker = this.emojis.find((emoji) => emoji.name === locationMarkerName);

        const [name, stockpile, quantity] = state;
        name.push(e.expandedCatalog.data.DisplayName);
        stockpile.push(
          // `${locationMarker ? locationMarker.toString() : locationMarkerName} ${e.stockpile.name}`,
          `${e.stockpile.name} @ ${e.log.expandedLocation.getMajorName()}`,
        );
        quantity.push(e.getValue());
        return state;
      },
      [[], [], []] as [string[], string[], string[]],
    );

    if (name.length > ITEMS_PER_TABLE * 3) {
      throw new InternalError(
        'INTERNAL_SERVER_ERROR',
        "Stockpile categories exceeded Discord's limits. If you are seeing this message then it is due to a bug. Please report it.",
      ).asDisplayable();
    }

    for (
      let count = 0;
      count < name.length && count < ITEMS_PER_TABLE * 3;
      count += ITEMS_PER_TABLE
    ) {
      const nameSlice = name.slice(count, count + ITEMS_PER_TABLE).join('\n');
      const stockpileSlice = stockpile.slice(count, count + ITEMS_PER_TABLE).join('\n');
      const quantitySlice = quantity.slice(count, count + ITEMS_PER_TABLE).join('\n');

      if (nameSlice.length > 1024 || stockpileSlice.length > 1024 || quantitySlice.length > 1024) {
        throw new InternalError(
          'INTERNAL_SERVER_ERROR',
          "Stockpile message exceeded Discord's limits. If you are seeing this message then it is due to a bug. Please report it.",
        );
      }

      embed.addFields(
        {
          name: 'Item',
          value: nameSlice,
          inline: true,
        },
        {
          name: 'Stockpile',
          value: stockpileSlice,
          inline: true,
        },
        {
          name: 'Quantity',
          value: quantitySlice,
          inline: true,
        },
      );
    }

    return this.add({ embeds: [embed] });
  }
}
