import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { SelectGuild } from 'src/core/guild/guild.entity';
import { AccessEntry, SelectAccessEntry } from './access.entity';

const searchWhere = (alias: string = 'entry') => {
  return new Brackets((qb) => qb.where(`${alias}.description ILIKE :query`));
};

export class AccessEntryQueryBuilder extends CommonQueryBuilder<AccessEntry> {
  constructor(repo: Repository<AccessEntry>) {
    super(repo, 'entry');
    this.qb.leftJoinAndSelect('entry.guild', 'guild');
  }

  byEntry(entryRef: SelectAccessEntry | SelectAccessEntry[]) {
    if (!Array.isArray(entryRef)) {
      entryRef = [entryRef];
    }

    this.qb.andWhere('entry.id IN (:...entries)', { entries: entryRef.map((e) => e.id) });

    return this;
  }

  byGuild(guildRef: SelectGuild | SelectGuild[]) {
    if (!Array.isArray(guildRef)) {
      guildRef = [guildRef];
    }

    const params = guildRef.reduce(
      (acc, g) => {
        if (g.id) acc.guilds.push(g.id);
        if (g.guildSf) acc.discordGuilds.push(g.guildSf);
        return acc;
      },
      { guilds: [], discordGuilds: [] },
    );

    this.qb.andWhere(
      new Brackets((qb) => {
        if (params.guilds.length) {
          qb.where('entry.guild_id IN (:...guilds)');
        }

        if (params.discordGuilds.length) {
          qb.orWhere('guild.guild_sf IN (:...discordGuilds)');
        }
      }),
      params,
    );

    return this;
  }

  search(query: string) {
    this.qb.andWhere(searchWhere(), { query: `%${query}%` });
    return this;
  }
}
