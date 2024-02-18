import {
  Context,
  Modal,
  ModalContext,
  Options,
  SlashCommandContext,
  Subcommand,
} from 'necord';
import {
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { Injectable, Logger } from '@nestjs/common';
import { DashboardCommand } from './dashboard.group';
import { CreateDashboardCommandParams } from './create.params';

@Injectable()
@DashboardCommand()
export class CreateDashboardCommand {
  private readonly logger = new Logger(CreateDashboardCommand.name);

  @Subcommand({
    name: 'create',
    description: 'Create a new dashboard',
  })
  public async onCreate(
    @Context() [interaction]: SlashCommandContext,
    @Options() data: CreateDashboardCommandParams,
  ) {
    this.logger.debug(`Input text: ${data.text}`);

    const modal = new ModalBuilder()
      .setTitle('hello, world!')
      .setCustomId('modal-test')
      .setComponents([
        new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents([
          new TextInputBuilder()
            .setCustomId('test')
            .setLabel('???')
            .setStyle(TextInputStyle.Paragraph),
        ]),
      ]);

    return interaction.showModal(modal.toJSON());
  }

  @Modal('modal-test')
  public async onModalResponse(@Context() [interaction]: ModalContext) {
    await interaction.deferReply({ ephemeral: true });

    const message = await interaction.channel.send({
      content: `hello, world! ${interaction.fields.getTextInputValue('test')}`,
    });

    this.logger.debug(`Target message id: ${message.id}`);

    await interaction.editReply({
      content: 'Done',
    });
  }
}
