import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GuildManager } from 'discord.js';
import { AuthGuard } from 'src/core/api/auth.guard';
import { Auth } from 'src/core/api/auth.decorator';
import { APITokenPayload } from 'src/core/api/api.service';
import { GuildService } from 'src/core/guild/guild.service';
import { CrewMemberService } from 'src/core/crew/member/crew-member.service';
import { AccessService } from './access.service';
import { AccessEntry } from './access.entity';
import { AccessRule } from './access-rule';
import { AccessRuleInner } from './access-rule-inner';
import { AccessDecision } from './access-decision';
import { InsertAccessEntryDto } from './dto/insert-access.dto';

@ApiTags('rule')
@ApiBearerAuth()
@ApiExtraModels(AccessRule, AccessRuleInner)
@Controller('authorization')
@UseGuards(AuthGuard)
export class AccessEntryController {
  private readonly logger = new Logger(AccessEntryController.name);

  constructor(
    private readonly guildManager: GuildManager,
    private readonly accessService: AccessService,
    private readonly guildService: GuildService,
    private readonly memberService: CrewMemberService,
  ) {}

  @Post('rule')
  @HttpCode(201)
  @ApiBody({ required: true, type: InsertAccessEntryDto })
  @ApiResponse({ status: 201, description: 'Created' })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  async createRule(@Auth() auth: APITokenPayload, @Body() body: InsertAccessEntryDto) {
    const guild = await this.guildService.query().byGuild({ guildSf: auth.aud }).getOneOrFail();
    await this.accessService.createRule({ ...body, guildId: guild.id, updatedBy: auth.sub });
  }

  @Get('rule')
  @ApiQuery({ name: 'q', description: 'query', required: false })
  @ApiResponse({
    status: 200,
    description: 'Defined access rules',
    type: [AccessEntry],
  })
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  async getRules(@Auth() auth: APITokenPayload, @Query('q') query: string = '') {
    return this.accessService.query().byGuild({ guildSf: auth.aud }).search(query).getMany();
  }

  @Get('rule/:rule/test')
  @HttpCode(204)
  @ApiResponse({ status: 401, description: 'Authentication Failed' })
  async testRule(@Auth() auth: APITokenPayload, @Param('rule') ruleId: string) {
    const entry = await this.accessService
      .query()
      .byGuild({ guildSf: auth.aud })
      .byEntry({ id: ruleId })
      .getOneOrFail();

    const discordGuild = await this.guildManager.fetch(auth.aud);
    const member = await discordGuild.members.fetch(auth.sub);
    const members = await this.memberService
      .query()
      .byGuild({ guildSf: auth.aud })
      .byMember(auth.sub)
      .getMany();

    const result = AccessDecision.fromEntry(entry).permit(
      auth.sub,
      Array.from(member.roles.valueOf().keys()),
      members,
    );
    this.logger.debug(`Testing access for '${entry.description}': ${result}`);

    if (!result) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }
}
