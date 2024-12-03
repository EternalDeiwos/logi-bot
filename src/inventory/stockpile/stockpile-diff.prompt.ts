import { EmbedBuilder, Colors, Collection, ApplicationEmoji, EmbedData } from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { InternalError } from 'src/errors';
import { StockpileDiff } from './stockpile-diff.entity';

const ITEMS_PER_TABLE = 14;
const DEFAULT_EMBED_OPTIONS: EmbedData = {
  title: 'Stockpile',
  color: Colors.DarkGreen,
};

export class StockpileDiffPromptBuilder extends BasePromptBuilder {
  constructor(
    private readonly emojis: Collection<string, ApplicationEmoji>,
    ...args: ConstructorParameters<typeof BasePromptBuilder>
  ) {
    super(...args);
  }

  displayFields(diff: StockpileDiff[], options: EmbedData = {}) {
    const [name, stockpile, change] = diff.reduce(
      (state, d) => {
        const [name, stockpile, change] = state;
        name.push(d.catalog.data.DisplayName);
        stockpile.push(`${d.stockpile.name} @ ${d.stockpile.expandedLocation.getMajorName()}`);
        change.push(d.getValue());
        return state;
      },
      [[], [], []] as [string[], string[], string[]],
    );

    for (let embedCount = 0; embedCount < name.length; embedCount += ITEMS_PER_TABLE * 3) {
      const { title, ...rest } = options;
      const embed = new EmbedBuilder({
        ...DEFAULT_EMBED_OPTIONS,
        title: this.length ? `${title} Cont'd` : title,
        ...rest,
      }).setTimestamp();

      for (
        let count = embedCount;
        count < name.length && count < embedCount + ITEMS_PER_TABLE * 3;
        count += ITEMS_PER_TABLE
      ) {
        const nameSlice = name.slice(count, count + ITEMS_PER_TABLE).join('\n');
        const stockpileSlice = stockpile.slice(count, count + ITEMS_PER_TABLE).join('\n');
        const changeSlice = change.slice(count, count + ITEMS_PER_TABLE).join('\n');

        if (nameSlice.length > 1024 || stockpileSlice.length > 1024 || changeSlice.length > 1024) {
          throw new InternalError(
            'INTERNAL_SERVER_ERROR',
            "Stockpile diff table exceeded Discord's message size limits. If you are seeing this message then it is due to a bug. Please report it.",
          ).asDisplayable();
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
            name: 'Change',
            value: changeSlice,
            inline: true,
          },
        );
      }
      this.add({ embeds: [embed] });
    }

    return this;
  }
}
