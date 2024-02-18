import { Controller, Get } from '@nestjs/common';
import * as pkg from '../package.json';

export type ApplicationInformation = {
  name: string;
  version: string;
};

@Controller()
export class AppController {
  @Get()
  getInfo(): ApplicationInformation {
    return {
      name: pkg.name,
      version: pkg.version,
    };
  }
}
