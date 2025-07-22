import {
  ActionRowBuilder,
  messageLink,
  ModalBuilder,
  Snowflake,
  TextInputBuilder,
  TextInputStyle,
  userMention,
} from 'discord.js';
import { SelectCrewChannelDto } from 'src/core/crew/crew.entity';

type TicketFormFields = 'who' | 'what' | 'detail' | 'where' | 'when';
type TicketFormProperties = { [K in TicketFormFields]?: { emoji?: string; value?: string } };

const formDetail = {
  en: {
    title: 'Create a Ticket',
    who: {
      label: 'Your Regiment',
      placeholder: 'e.g. HvL or none',
    },
    what: {
      label: 'Request',
      placeholder: 'e.g. x25 Spatha + x36 Nemesis',
    },
    detail: {
      label: 'Details',
      placeholder: 'Extra information for your request, e.g. how do you intend to pay?',
    },
    where: {
      label: 'Where',
      value: 'We will fetch it when it is done',
    },
    when: {
      label: 'When',
      value: 'ASAP',
    },
  },
  fr: {
    title: 'Créer un ticket',
    who: {
      label: 'Régiment',
      placeholder: 'ex : HvL ou aucun',
    },
    what: {
      label: 'Demande',
      placeholder: 'ex : x25 Spatha + x36 Nemesis',
    },
    detail: {
      label: 'Détails',
      placeholder: 'Informations supplémentaires, ex. comment comptez-vous payer ?',
    },
    where: {
      label: 'Où',
      value: 'We will fetch it when it is done',
    },
    when: {
      label: 'Quand',
      value: 'As soon as possible',
    },
  },
  ru: {
    title: 'Создать заявку',
    who: {
      label: 'Полк',
      placeholder: 'Например AIR или нет',
    },
    what: {
      label: 'Запрос',
      placeholder: 'Например x25 Spatha + x36 Nemesis',
    },
    detail: {
      label: 'Подробности',
      placeholder: 'Дополнительно о вашем запросе, например, как вы планируете платить?',
    },
    where: {
      label: 'Где',
      value: 'We will fetch it when it is done',
    },
    when: {
      label: 'Когда',
      value: 'As soon as possible',
    },
  },
  pl: {
    title: 'Utwórz zgłoszenie',
    who: {
      label: 'Pułk',
      placeholder: 'np. KoP lub brak',
    },
    what: {
      label: 'Prośba',
      placeholder: 'np. x25 Spatha + x36 Nemesis',
    },
    detail: {
      label: 'Szczegóły',
      placeholder: 'Dodatkowe informacje, np. w jaki sposób zamierzasz zapłacić?',
    },
    where: {
      label: 'Gdzie',
      value: 'We will fetch it when it is done',
    },
    when: {
      label: 'Kiedy',
      value: 'As soon as possible',
    },
  },
  zh: {
    title: '创建工单',
    who: {
      label: '团级',
      placeholder: 'HvL 或 无',
    },
    what: {
      label: '请求',
      placeholder: '例如：x25 Spatha + x36 Nemesis',
    },
    detail: {
      label: '详细信息',
      placeholder: '附加信息，例如：您打算如何支付？',
    },
    where: {
      label: '位置',
      value: 'We will fetch it when it is done',
    },
    when: {
      label: '时间',
      value: 'As soon as possible',
    },
  },
} as const;
export const supportedLocales = Object.keys(formDetail) as (keyof typeof formDetail)[];

export const makeProxyTicketMessage = (
  body: string,
  memberSf: Snowflake,
  authorSf: Snowflake,
  channelSf: Snowflake,
  messageSf: Snowflake,
) =>
  `This ticket was created by ${userMention(memberSf)} on behalf of ${userMention(authorSf)} from this message: ${messageLink(channelSf, messageSf)}.

${
  body &&
  body
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')
}
`.trim();

export class TicketCreateModalBuilder extends ModalBuilder {
  addForm(
    crewRef: SelectCrewChannelDto,
    authorRef: Snowflake,
    locale: keyof typeof formDetail | null = 'en',
    { who, what, detail, where, when }: TicketFormProperties = {},
  ) {
    if (!locale || !supportedLocales.includes(locale)) {
      locale = 'en';
    }

    const whoInput = new TextInputBuilder()
      .setCustomId('ticket/form/who')
      .setLabel((who?.emoji ? `${who.emoji} ` : '') + formDetail[locale].who.label)
      .setPlaceholder(formDetail[locale].who.placeholder)
      .setValue(who?.value || '')
      .setMaxLength(6)
      .setRequired(false)
      .setStyle(TextInputStyle.Short);

    const whatInput = new TextInputBuilder()
      .setCustomId('ticket/form/what')
      .setLabel((what?.emoji ? `${what.emoji} ` : '') + formDetail[locale].what.label)
      .setPlaceholder(formDetail[locale].what.placeholder)
      .setMaxLength(32)
      .setRequired(true)
      .setValue(what?.value || '')
      .setStyle(TextInputStyle.Short);

    const detailInput = new TextInputBuilder()
      .setCustomId('ticket/form/detail')
      .setLabel((detail?.emoji ? `${detail.emoji} ` : '') + formDetail[locale].detail.label)
      .setPlaceholder(formDetail[locale].detail.placeholder)
      .setRequired(false)
      .setValue(detail?.value || '')
      .setStyle(TextInputStyle.Paragraph);

    const whereInput = new TextInputBuilder()
      .setCustomId('ticket/form/where')
      .setLabel((where?.emoji ? `${where.emoji} ` : '') + formDetail[locale].where.label)
      .setValue(where?.value || formDetail[locale].where.value)
      .setStyle(TextInputStyle.Paragraph);

    const whenInput = new TextInputBuilder()
      .setCustomId('ticket/form/when')
      .setLabel((when?.emoji ? `${when.emoji} ` : '') + formDetail[locale].when.label)
      .setValue(when?.value || formDetail[locale].when.value)
      .setStyle(TextInputStyle.Short);

    return this.setCustomId(`ticket/create/${crewRef.crewSf}/${authorRef}`)
      .setTitle(formDetail[locale].title)
      .addComponents(
        [whoInput, whatInput, detailInput, whereInput, whenInput].map((input) =>
          new ActionRowBuilder<TextInputBuilder>().addComponents(input),
        ),
      );
  }
}
