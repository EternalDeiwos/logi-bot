import { Brackets, Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { Guild, SelectGuildDto } from 'src/core/guild/guild.entity';

export class GuildQueryBuilder extends CommonQueryBuilder<Guild> {
  private excludeDiscriminator = 0;

  constructor(repo: Repository<Guild>) {
    super(repo, 'guild');
    this.qb.leftJoinAndSelect('guild.settings', 'setting');
  }

  byGuild(guildRef: SelectGuildDto | SelectGuildDto[]) {
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
          qb.where(`${this.alias}.id IN (:...guilds)`);
        }

        if (params.discordGuilds.length) {
          qb.orWhere(`${this.alias}.guild_sf IN (:...discordGuilds)`);
        }
      }),
      params,
    );

    return this;
  }

  search(query: string) {
    this.qb.andWhere('guild.name ILIKE :query', { query: `%${query}%` });
    return this;
  }

  exclude(guildRef: SelectGuildDto | SelectGuildDto[]) {
    if (Array.isArray(guildRef)) {
      guildRef.forEach((guildRef) => this.exclude(guildRef));
    } else {
      const d = this.excludeDiscriminator++;
      if (guildRef.id) {
        this.qb.andWhere(`guild.id!=:id${d}`, { [`id${d}`]: guildRef.id });
      } else {
        this.qb.andWhere(`guild.guild_sf!=:guildSf${d}`, { [`guildSf${d}`]: guildRef.guildSf });
      }
    }

    return this;
  }

  withAccessRules() {
    this.qb.leftJoinAndSelect('guild.access', 'access').leftJoinAndSelect('access.rule', 'rule');
    return this;
  }

  withSharedCrews() {
    this.qb.leftJoinAndSelect('guild.shared', 'shared').leftJoinAndSelect('shared.crew', 'crew');
    return this;
  }

  withSharedGuild() {
    this.qb.leftJoinAndSelect('crew.guild', 'shared_guild');
    return this;
  }

  withSharedTeam() {
    this.qb.leftJoinAndSelect('crew.team', 'shared_team');
    return this;
  }

  withSharedMembers() {
    this.qb.leftJoinAndSelect('crew.members', 'shared_member');
    return this;
  }
}
