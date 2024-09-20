import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Inject authenticated information
 * @see {APITokenPayload}
 */
export const Auth = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request?.auth?.payload;
});
