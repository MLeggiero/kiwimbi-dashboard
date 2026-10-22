import { describe, expect, it } from 'vitest';
import { authorize } from '../server/access';
import { readConfig } from '../server/config';

const cfg = readConfig({ ALLOWED_DOMAIN: '@Kiwimbi.org', MANAGER_EMAILS: 'Boss@kiwimbi.org, ops@kiwimbi.org' });

describe('readConfig', () => {
  it('normalizes settings and applies defaults', () => {
    expect(cfg.allowedDomain).toBe('kiwimbi.org');
    expect(cfg.managerEmails).toEqual(['boss@kiwimbi.org', 'ops@kiwimbi.org']);
    expect(cfg.responsesTab).toBe('Form Responses');
    expect(cfg.cacheSeconds).toBe(600);
    expect(cfg.timezone).toBe('Africa/Nairobi');
    expect(readConfig({ CACHE_SECONDS: '5' }).cacheSeconds).toBe(60);
    expect(readConfig({ CACHE_SECONDS: '999999' }).cacheSeconds).toBe(21600);
  });
});

describe('authorize', () => {
  it('always denies when no identity is visible', () => {
    expect(authorize('', cfg)).toMatchObject({ ok: false, reason: 'no_identity' });
  });

  it('enforces the domain, even for listed managers', () => {
    expect(authorize('someone@gmail.com', cfg)).toMatchObject({ ok: false, reason: 'wrong_domain' });
    expect(authorize('boss@kiwimbi.org.evil.com', cfg)).toMatchObject({ ok: false, reason: 'wrong_domain' });
    expect(authorize('boss@kiwimbi.org', readConfig({ ALLOWED_DOMAIN: 'other.org', MANAGER_EMAILS: 'boss@kiwimbi.org' }))).toMatchObject({ ok: false });
  });

  it('assigns roles', () => {
    expect(authorize('Boss@Kiwimbi.org', cfg)).toMatchObject({ ok: true, role: 'manager', email: 'boss@kiwimbi.org' });
    expect(authorize('staff@kiwimbi.org', cfg)).toMatchObject({ ok: true, role: 'viewer' });
  });

  it('honors an explicit allow list', () => {
    const listed = readConfig({ ALLOWED_DOMAIN: 'kiwimbi.org', ALLOWED_EMAILS: 'a@kiwimbi.org', MANAGER_EMAILS: 'm@kiwimbi.org' });
    expect(authorize('a@kiwimbi.org', listed)).toMatchObject({ ok: true, role: 'viewer' });
    expect(authorize('b@kiwimbi.org', listed)).toMatchObject({ ok: false, reason: 'not_on_list' });
    expect(authorize('m@kiwimbi.org', listed)).toMatchObject({ ok: true, role: 'manager' });
  });

  it('fails closed when access has not been configured', () => {
    expect(authorize('anyone@kiwimbi.org', readConfig({}))).toMatchObject({ ok: false, reason: 'not_configured' });
    expect(authorize('m@kiwimbi.org', readConfig({ MANAGER_EMAILS: 'm@kiwimbi.org' }))).toMatchObject({ ok: true, role: 'manager' });
  });
});
