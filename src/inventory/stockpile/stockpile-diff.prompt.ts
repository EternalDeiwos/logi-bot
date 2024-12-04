import { EmbedBuilder, Colors, Collection, ApplicationEmoji, EmbedData } from 'discord.js';
import { BasePromptBuilder } from 'src/bot/prompt';
import { InternalError } from 'src/errors';
import { StockpileDiff } from './stockpile-diff.entity';

const ITEMS_PER_TABLE = 20;
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
    const [name, quantity, change] = diff.reduce(
      (state, d) => {
        const [name, quantity, change] = state;
        name.push(d.catalog.data.DisplayName);
        quantity.push(d.getValue());
        change.push(d.getDiff());
        return state;
      },
      [[], [], []] as [string[], string[], string[]],
    );

    for (let embedCount = 0; embedCount < name.length; embedCount += ITEMS_PER_TABLE * 3) {
      const { title, ...rest } = options;
      const embed = new EmbedBuilder({
        ...DEFAULT_EMBED_OPTIONS,
        title,
        // title: this.length ? `${title} Cont'd` : title,
        ...rest,
      }).setTimestamp();

      for (
        let count = embedCount;
        count < name.length && count < embedCount + ITEMS_PER_TABLE * 3;
        count += ITEMS_PER_TABLE
      ) {
        const nameSlice = name.slice(count, count + ITEMS_PER_TABLE).join('\n');
        const quantitySlice = quantity.slice(count, count + ITEMS_PER_TABLE).join('\n');
        const changeSlice = change.slice(count, count + ITEMS_PER_TABLE).join('\n');

        if (nameSlice.length > 1024 || quantitySlice.length > 1024 || changeSlice.length > 1024) {
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
            name: 'Quantity',
            value: quantitySlice,
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
