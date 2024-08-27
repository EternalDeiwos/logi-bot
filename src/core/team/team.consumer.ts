import { Injectable, Logger } from '@nestjs/common';
import { RabbitRPC } from '@golevelup/nestjs-rabbitmq';
import { ConsumerResponsePayload, DiscordCommandHandlerPayload } from 'src/types';
import { AuthError } from 'src/errors';
import { GuildService } from 'src/core/guild/guild.service';
import { TeamService } from './team.service';
import { InsertTeam, SelectTeam } from './team.entity';

type RegisterTeamHandlerPayload = { team: InsertTeam } & DiscordCommandHandlerPayload;
type DeregisterTeamHandlerPayload = { team: SelectTeam } & DiscordCommandHandlerPayload;

@Injectable()
export class TeamConsumer {
  private readonly logger = new Logger(TeamConsumer.name);

  constructor(
    private readonly guildService: GuildService,
    private readonly teamService: TeamService,
  ) {}

  @RabbitRPC({
    exchange: 'discord',
    routingKey: 'discord.rpc.team.register',
    queue: 'discord-team-register',
    queueOptions: {
      deadLetterExchange: 'retry',
      durable: true,
    },
  })
  public async registerGuildHandler(
    payload: RegisterTeamHandlerPayload,
  ): Promise<ConsumerResponsePayload> {
    const { team, interaction } = payload;

    if (!(await this.guildService.isGuildAdmin(interaction))) {
      throw new AuthError('FORBIDDEN', interaction);
    }

    const result = await this.teamService.registerTeam(team, { guildSf: interaction.guildId });
    return { content: result?.identifiers?.length };
  }

  @RabbitRPC({
    exchange: 'discord',
    routingKey: 'discord.rpc.team.deregister',
    queue: 'discord-team-deregister',
    queueOptions: {
      deadLetterExchange: 'retry',
      durable: true,
    },
  })
  public async deregisterGuildHandler(
    payload: DeregisterTeamHandlerPayload,
  ): Promise<ConsumerResponsePayload> {
    const { team, interaction } = payload;

    if (!(await this.guildService.isGuildAdmin(interaction))) {
      throw new AuthError('FORBIDDEN', interaction);
    }

    const result = await this.teamService.deleteTeam(team);
    return { content: result?.affected };
  }
}
