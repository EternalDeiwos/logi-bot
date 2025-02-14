import { Injectable, Logger } from '@nestjs/common';
import { DeleteResult, InsertResult } from 'typeorm';
import { TeamRepository } from './team.repository';
import { InsertTeamDto, SelectTeamDto } from './team.entity';
import { TeamQueryBuilder } from './team.query';

export abstract class TeamService {
  abstract query(): TeamQueryBuilder;
  abstract registerTeam(team: InsertTeamDto): Promise<InsertResult>;
  abstract deleteTeam(team: SelectTeamDto): Promise<DeleteResult>;
}

@Injectable()
export class TeamServiceImpl extends TeamService {
  private readonly logger = new Logger(TeamService.name);

  constructor(private readonly teamRepo: TeamRepository) {
    super();
  }

  query(): TeamQueryBuilder {
    return new TeamQueryBuilder(this.teamRepo);
  }

  async registerTeam(team: InsertTeamDto) {
    return this.teamRepo.upsert(team, ['name', 'guildId', 'deletedAt']);
  }

  async deleteTeam(teamRef: SelectTeamDto) {
    const team = await this.query().byTeam(teamRef).getOneOrFail();
    return await this.teamRepo.updateReturning(teamRef, { deletedAt: new Date() });
  }
}
