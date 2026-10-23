// Chart colors are read from the CSS tokens so light/dark mode has one source of truth.
// Canvas charts can't use CSS variables directly, so they re-read them when the theme flips.

export type ThemePref = 'system' | 'light' | 'dark';

export interface ChartTheme {
  dark: boolean;
  ink: string;
  ink2: string;
  ink3: string;
  card: string;
  grid: string;
  axis: string;
  ghost: string;
  holiday: string;
  hatch: string;
  series: string[];
  ramp: string[];
  good: string;
  crit: string;
}

const STORAGE_KEY = 'kiwimbi-theme';

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export const themeState = $state({ pref: readPref(), version: 0 });

function bump() {
  themeState.version++;
}

if (typeof window !== 'undefined') {
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', bump);
}

export function setTheme(pref: ThemePref) {
  themeState.pref = pref;
  const root = document.documentElement;
  if (pref === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', pref);
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* storage may be blocked; the choice still applies for this visit */
  }
  bump();
}

export function isDark(): boolean {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr) return attr === 'dark';
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function readChartTheme(): ChartTheme {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    dark: isDark(),
    ink: v('--ink'),
    ink2: v('--ink-2'),
    ink3: v('--ink-3'),
    card: v('--card'),
    grid: v('--grid'),
    axis: v('--axis'),
    ghost: v('--ghost'),
    holiday: v('--holiday'),
    hatch: v('--hatch'),
    series: [1, 2, 3, 4, 5, 6].map((i) => v(`--series-${i}`)),
    ramp: [0, 1, 2, 3, 4, 5, 6].map((i) => v(`--ramp-${i}`)),
    good: v('--good'),
    crit: v('--crit'),
  };
}
