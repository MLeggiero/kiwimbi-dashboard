import type { Config } from './config';

export type Role = 'viewer' | 'manager';
export type DenyReason = 'no_identity' | 'wrong_domain' | 'not_on_list' | 'not_configured';

export interface AuthResult {
  ok: boolean;
  email: string;
  role?: Role;
  reason?: DenyReason;
}

/**
 * Decides whether a signed-in Google account may see the dashboard. Fails closed:
 * - no visible identity (e.g. a deployment opened to outside accounts) is always denied;
 * - with neither ALLOWED_DOMAIN nor ALLOWED_EMAILS set, only managers get in.
 */
export function authorize(rawEmail: string, cfg: Pick<Config, 'allowedDomain' | 'allowedEmails' | 'managerEmails'>): AuthResult {
  const email = (rawEmail || '').trim().toLowerCase();
  if (!email) return { ok: false, email, reason: 'no_identity' };
  if (cfg.allowedDomain && !email.endsWith('@' + cfg.allowedDomain)) return { ok: false, email, reason: 'wrong_domain' };
  if (cfg.managerEmails.includes(email)) return { ok: true, email, role: 'manager' };
  if (cfg.allowedEmails.length) {
    return cfg.allowedEmails.includes(email) ? { ok: true, email, role: 'viewer' } : { ok: false, email, reason: 'not_on_list' };
  }
  if (!cfg.allowedDomain) return { ok: false, email, reason: 'not_configured' };
  return { ok: true, email, role: 'viewer' };
}
