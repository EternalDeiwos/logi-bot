import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'discord.js';
import { glob } from 'glob';
import path from 'path';
import fs from 'node:fs/promises';

export abstract class EmojiService {
  abstract configureApplicationEmoji();
}

@Injectable()
export class EmojiServiceImpl extends EmojiService {
  private logger = new Logger(EmojiService.name, { timestamp: true });

  constructor(private readonly client: Client) {
    super();
  }

  async configureApplicationEmoji() {
    const emoji = await this.client.application.emojis.fetch();
    const files = await glob('assets/icons/**/*.png', { ignore: 'node_modules/**' });

    for (const filePath of files) {
      const name = path.basename(filePath, '.png');

      if (!emoji.find((e) => e.name === name)) {
        const attachment = await fs.readFile(filePath, { flag: 'r' });
        await this.client.application.emojis.create({ name, attachment });
        this.logger.log(`Registered new application icon: ${name}`);
      } else {
        this.logger.log(`Found icon for \`${name}\`, skipping upload`);
      }
    }
  }
}
