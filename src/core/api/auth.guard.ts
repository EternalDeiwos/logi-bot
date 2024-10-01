import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { jwtVerify } from 'jose';
import { ApiService, APITokenPayload } from './api.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly apiService: ApiService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authorization = request.headers.authorization?.split(' ');

    if (!authorization) {
      throw new HttpException('Authentication Failed', HttpStatus.UNAUTHORIZED, {
        cause: new Error('No api key provided'),
      });
    }

    const [mode, jwtText] = authorization;

    if (mode.toLowerCase() === 'bearer') {
      return jwtVerify<APITokenPayload>(jwtText, (headers) => {
        const { kid } = headers;

        const keys = this.apiService.getSigningKeys();
        const k = keys.find(([id]) => kid === id);

        if (!k) {
          throw new HttpException('Authentication Failed', HttpStatus.UNAUTHORIZED, {
            cause: new Error('Could not retrieve signing key'),
          });
        }

        return k[1];
      })
        .then((v) => {
          request.auth = APITokenPayload.from(v?.payload);
          return true;
        })
        .catch((cause) => {
          throw new HttpException('Authentication Failed', HttpStatus.UNAUTHORIZED, {
            cause,
          });
        });
    }

    return false;
  }
}
