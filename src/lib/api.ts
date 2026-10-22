import type { OpsPayload, PublicPayload } from '../../shared/types';

// Calls into the Apps Script server through google.script.run. Outside Apps Script
// (local development only) the calls go to a mock backed by synthetic data; that code
// is stripped from production builds.

declare const google: {
  script: {
    run: Record<string, (...args: unknown[]) => void> & {
      withSuccessHandler(fn: (v: unknown) => void): typeof google.script.run;
      withFailureHandler(fn: (e: Error) => void): typeof google.script.run;
    };
  };
};

export const inAppsScript = () => typeof google !== 'undefined' && !!google?.script?.run;

function call(fn: 'getDashboardData' | 'getOpsData'): Promise<string> {
  if (inAppsScript()) {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler((v) => resolve(String(v)))
        .withFailureHandler((e) => reject(e instanceof Error ? e : new Error(String(e))))
        [fn]();
    });
  }
  if (import.meta.env.DEV) return import('../../dev/mock-api').then((m) => m.call(fn));
  return Promise.reject(new Error('This page only works when opened from its Google Apps Script link.'));
}

export async function fetchDashboard(): Promise<PublicPayload> {
  return JSON.parse(await call('getDashboardData')) as PublicPayload;
}

export async function fetchOps(): Promise<OpsPayload> {
  return JSON.parse(await call('getOpsData')) as OpsPayload;
}
