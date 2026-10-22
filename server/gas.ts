import { readConfig, type Config } from './config';

// Helpers that touch Google services directly. Kept apart from the pure access and
// config logic so that logic can be unit-tested without Apps Script.

export function loadConfig_(): Config {
  return readConfig(PropertiesService.getScriptProperties().getProperties());
}

/** Secret used to pseudonymize reporter names. Created on first use; never leaves Script Properties. */
export function getHashKey_(): string {
  const props = PropertiesService.getScriptProperties();
  const existing = props.getProperty('NAME_HASH_KEY');
  if (existing) return existing;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    let key = props.getProperty('NAME_HASH_KEY');
    if (!key) {
      key = Utilities.getUuid() + Utilities.getUuid();
      props.setProperty('NAME_HASH_KEY', key);
    }
    return key;
  } finally {
    lock.releaseLock();
  }
}

/** The signed-in viewer. Only visible when viewer and owner share the Workspace domain. */
export function viewerEmail_(): string {
  return Session.getActiveUser().getEmail() || '';
}

/**
 * Guards maintenance functions (checkSetup, installTriggers). They must be run by a
 * person from the Apps Script editor, never by a viewer through the web app, where
 * the active user (viewer) differs from the effective user (owner). Once MANAGER_EMAILS
 * is set, the person must also be a manager (this still holds if the deployment is ever
 * switched to "execute as the user accessing the web app").
 */
export function assertMaintainer_(cfg: Config): void {
  const active = (Session.getActiveUser().getEmail() || '').toLowerCase();
  const effective = (Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!active || active !== effective) throw new Error('Run this from the Apps Script editor.');
  if (cfg.managerEmails.length && !cfg.managerEmails.includes(active)) throw new Error('Run this with an account listed in MANAGER_EMAILS.');
}
