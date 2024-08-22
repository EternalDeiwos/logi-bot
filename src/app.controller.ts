import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service';
import * as pkg from '../package.json';

export type ApplicationInformation = {
  name: string;
  version: string;
  invite_link: string;
};

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getInfo(): ApplicationInformation {
    const invite_link = this.appService.inviteUrl();

    return {
      name: pkg.name,
      version: pkg.version,
      invite_link,
    };
  }

  @Get('invite')
  redirectInvite(@Res() res: Response) {
    return res.status(302).redirect(this.appService.inviteUrl());
  }
}
