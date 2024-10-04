import { Repository } from 'typeorm';
import { CommonQueryBuilder } from 'src/database/util';
import { Guild, SelectGuild } from 'src/core/guild/guild.entity';

export class GuildQueryBuilder extends CommonQueryBuilder<Guild> {
  private excludeDiscriminator = 0;

  constructor(repo: Repository<Guild>) {
    super(repo, 'guild');
  }

  byGuild(guildRef: SelectGuild) {
    if (guildRef.id) {
      this.qb.andWhere('guild.id=:id');
    } else {
      this.qb.andWhere('guild.guild_sf=:guildSf');
    }

    this.qb.setParameters(guildRef);
    return this;
  }

  search(query: string) {
    this.qb.andWhere('guild.name ILIKE :query', { query: `%${query}%` });
    return this;
  }

  exclude(guildRef: SelectGuild | SelectGuild[]) {
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
