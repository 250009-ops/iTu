import { ExecutionContext } from '@nestjs/common';

const AUTH_RATE_LIMIT_PATHS =
  /\/auth\/(login|register|forgot-password|reset-password)(?:\?|$)/;

const CONTACT_RATE_LIMIT_PATHS = /\/support\/contact(?:\?|$)/;

export function shouldSkipAuthThrottler(context: ExecutionContext): boolean {
  const url = context.switchToHttp().getRequest<{ url?: string }>().url ?? '';
  return !AUTH_RATE_LIMIT_PATHS.test(url);
}

export function shouldSkipContactThrottler(context: ExecutionContext): boolean {
  const url = context.switchToHttp().getRequest<{ url?: string }>().url ?? '';
  return !CONTACT_RATE_LIMIT_PATHS.test(url);
}
