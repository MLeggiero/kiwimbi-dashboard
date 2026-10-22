// Keeps the view (page, range, options) in the address bar so links can be bookmarked
// and shared. Inside Apps Script the app runs in an iframe, so the top-level URL is
// read and written through google.script.url / google.script.history.

declare const google: {
  script: {
    url?: { getLocation(cb: (loc: { parameter: Record<string, string> }) => void): void };
    history?: { replace(state: unknown, params: Record<string, string>, hash: string): void };
  };
};

const gasUrl = () => (typeof google !== 'undefined' ? google?.script?.url : undefined);

export function readParams(): Promise<Record<string, string>> {
  const url = gasUrl();
  if (url) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (p: Record<string, string>) => {
        if (!done) {
          done = true;
          resolve(p);
        }
      };
      url.getLocation((loc) => finish({ ...(loc?.parameter ?? {}) }));
      setTimeout(() => finish({}), 1500);
    });
  }
  return Promise.resolve(Object.fromEntries(new URLSearchParams(location.search)));
}

export function writeParams(params: Record<string, string>): void {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== ''));
  try {
    if (gasUrl() && google.script.history) google.script.history.replace(null, clean, '');
    else {
      // Keep unrelated parameters (e.g. ?role=viewer in local development).
      const merged = new URLSearchParams(location.search);
      for (const k of Object.keys(params)) merged.delete(k);
      for (const [k, v] of Object.entries(clean)) merged.set(k, v);
      history.replaceState(null, '', `${location.pathname}?${merged}`);
    }
  } catch {
    /* URL sync is a convenience; never break the app over it */
  }
}
