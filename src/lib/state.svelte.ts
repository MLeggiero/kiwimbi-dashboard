import { dayToIso, isoToDay, shiftMonths, shiftYears } from '../../shared/dates';
import type { OpsPayload } from '../../shared/types';
import { fetchDashboard, fetchOps } from './api';
import { buildDataset, type Dataset } from './dataset';
import { availablePresets, presetRange, PRESETS, storyOffersYtd, type Preset } from './presets';
import { COMPARE_MODES, FOCUS_CHOICES, makeComparison, type CompareMode, type CompareSpec, type Comparison, type Focus } from './compare';
import { autoGranularity, type Granularity } from './series';

/** 'story' is the impact story everyone sees; 'managers' is the detailed dashboard (managers land here). */
export type Mode = 'story' | 'managers';
export type PageId = 'overview' | 'meals' | 'library' | 'mentorship' | 'programs' | 'health';
export type ViewMode = 'weekly' | 'cumulative' | 'rate';
export type GranChoice = 'auto' | Granularity;

export const PAGES: { id: PageId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'home' },
  { id: 'meals', label: 'Meals', icon: 'plate' },
  { id: 'library', label: 'Library', icon: 'book' },
  { id: 'mentorship', label: 'Teaching & Mentoring', icon: 'school' },
  { id: 'programs', label: 'Programs', icon: 'spark' },
  { id: 'health', label: 'Data health', icon: 'grid' },
];

const message = (e: unknown) => (e instanceof Error ? e.message : String(e ?? 'Something went wrong.'));

class AppState {
  modeChoice = $state<Mode>('managers');
  page = $state<PageId>('overview');
  preset = $state<Preset>('ytd');
  /** False until a range is picked (or comes from the link): each view then opens on its own default. */
  presetChosen = $state(false);
  customFrom = $state<number | null>(null);
  customTo = $state<number | null>(null);
  gran = $state<GranChoice>('auto');
  view = $state<ViewMode>('weekly');
  /** Draw last year as a grey line on the charts. */
  lastYear = $state(false);
  /** The "Compare two periods" tool: 'none' while it is closed. Nothing is drawn on the charts. */
  compare = $state<CompareMode>('none');
  /** The first period when comparing; custom dates for either period are kept as [from, to]. */
  focus = $state<Focus>('range');
  customA = $state<[number, number] | null>(null);
  customB = $state<[number, number] | null>(null);

  data = $state.raw<Dataset | null>(null);
  ops = $state.raw<OpsPayload | null>(null);
  opsError = $state<string | null>(null);
  loading = $state(true);
  refreshing = $state(false);
  error = $state<string | null>(null);
  fetchedAt = $state(0);
  now = $state(Date.now());
  /** Set while a Print button is printing something other than the default for the view. */
  printTarget = $state<'report' | 'page' | null>(null);

  /** The preset actually in use: one that isn't offered for this data falls back to "all". */
  activePreset = $derived.by((): Preset => {
    const ds = this.data;
    // The story opens on the last 3 months; the dashboard on year to date.
    const p: Preset = !this.presetChosen && this.mode === 'story' ? 'last3m' : this.preset;
    if (!ds || p === 'custom') return p;
    if (p === 'ytd' && this.mode === 'story' && !storyOffersYtd(ds)) return 'all';
    return availablePresets(ds).includes(p) ? p : 'all';
  });

  range = $derived.by((): [number, number] => {
    const ds = this.data;
    if (!ds) return [0, 0];
    if (this.preset === 'custom' && this.customFrom !== null && this.customTo !== null) {
      // Custom dates can't reach back before the first report either.
      const from = Math.max(Math.min(this.customFrom, this.customTo), ds.firstDay);
      return [from, Math.max(from, this.customFrom, this.customTo)];
    }
    return presetRange(this.activePreset === 'custom' ? 'all' : this.activePreset, ds);
  });

  granularity = $derived<Granularity>(this.gran === 'auto' ? autoGranularity(this.range[0], this.range[1]) : this.gran);

  /** What the charts draw: at most last year's line over the same dates. */
  chartSpec = $derived<CompareSpec>({ mode: this.lastYear ? 'yoy' : 'none', focus: 'range' });
  compareSpec = $derived<CompareSpec>({ mode: this.compare, focus: this.focus, a: this.customA, b: this.customB });
  comparison = $derived<Comparison | null>(this.data ? makeComparison(this.compareSpec, this.data, this.range, this.granularity) : null);

  isManager = $derived(this.data?.payload.viewer.isManager ?? false);
  /** Only managers can open the managers' view. */
  mode = $derived<Mode>(this.isManager && this.modeChoice === 'managers' ? 'managers' : 'story');

  setMode(m: Mode) {
    this.modeChoice = m;
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }

  setPreset(p: Preset) {
    if (p === 'custom') [this.customFrom, this.customTo] = this.range;
    this.preset = p;
    this.presetChosen = true;
  }

  setCompare(mode: CompareMode) {
    // Custom dates start from whatever the second period was, so switching is a small step, not a jump.
    if (mode === 'custom' && this.comparison) this.customB = [this.comparison.b.from, this.comparison.b.to];
    else if (mode === 'custom' && this.data) this.customB = [this.range[0] - (this.range[1] - this.range[0] + 1), this.range[0] - 1];
    this.compare = mode;
  }

  /** Open the comparison on something concrete: the last 4 weeks against the 4 before. */
  openCompare() {
    if (this.focus === 'range') this.focus = 'last4w';
    this.setCompare('prev');
  }

  setFocus(f: Focus) {
    if (f === 'custom') this.customA = this.comparison ? [this.comparison.a.from, this.comparison.a.to] : this.range;
    this.focus = f;
  }

  /**
   * Move the chart dates back (-1) or forward (1) by their own length: a month for "Last
   * month", a year for "Year to date", the term before or after for "This term". Never
   * before the first report or past today.
   */
  stepRange(dir: -1 | 1) {
    const ds = this.data;
    if (!ds) return;
    const [from, to] = this.range;
    const p = this.activePreset;
    let next: [number, number];
    const t = ds.terms.findIndex((x) => from >= x.start && from <= x.end);
    if (p === 'term' && ds.terms[t + dir]) next = [ds.terms[t + dir].start, ds.terms[t + dir].end];
    else if (p === 'last1m' || p === 'last3m') next = [shiftMonths(from, dir * (p === 'last1m' ? 1 : 3)), shiftMonths(to, dir * (p === 'last1m' ? 1 : 3))];
    else if (p === 'ytd' || p === 'lastyear') next = [shiftYears(from, dir), shiftYears(to, dir)];
    else next = [from + dir * (to - from + 1), to + dir * (to - from + 1)];
    if (next[1] < ds.firstDay || next[0] > ds.today) return;
    this.setCustom(Math.max(next[0], ds.firstDay), Math.min(next[1], ds.today));
  }

  setCustom(from: number, to: number) {
    this.customFrom = from;
    this.customTo = to;
    this.preset = 'custom';
    this.presetChosen = true;
  }

  async load() {
    if (this.data) this.refreshing = true;
    else this.loading = true;
    try {
      const payload = await fetchDashboard();
      this.data = buildDataset(payload);
      this.error = null;
      this.fetchedAt = Date.now();
      if (this.ops) void this.loadOps(true);
    } catch (e) {
      this.error = message(e);
    } finally {
      this.loading = false;
      this.refreshing = false;
    }
  }

  async loadOps(force = false) {
    if (this.ops && !force) return;
    try {
      this.ops = await fetchOps();
      this.opsError = null;
    } catch (e) {
      this.opsError = message(e);
    }
  }

  toParams(): Record<string, string> {
    return {
      view: this.isManager && this.mode === 'story' ? 'story' : '',
      p: this.page === 'overview' ? '' : this.page,
      r: this.presetChosen ? this.preset : '',
      from: this.preset === 'custom' && this.customFrom !== null ? dayToIso(this.customFrom) : '',
      to: this.preset === 'custom' && this.customTo !== null ? dayToIso(this.customTo) : '',
      g: this.gran === 'auto' ? '' : this.gran,
      v: this.view === 'weekly' ? '' : this.view,
      ly: this.lastYear ? '1' : '',
      c: this.compare === 'none' ? '' : this.compare,
      f: this.compare === 'none' || this.focus === 'range' ? '' : this.focus,
      af: this.compare !== 'none' && this.focus === 'custom' && this.customA ? dayToIso(this.customA[0]) : '',
      at: this.compare !== 'none' && this.focus === 'custom' && this.customA ? dayToIso(this.customA[1]) : '',
      bf: this.compare === 'custom' && this.customB ? dayToIso(this.customB[0]) : '',
      bt: this.compare === 'custom' && this.customB ? dayToIso(this.customB[1]) : '',
    };
  }

  applyParams(p: Record<string, string>) {
    const pick = <T extends string>(v: string | undefined, allowed: readonly T[]): T | null => (v && (allowed as readonly string[]).includes(v) ? (v as T) : null);
    this.modeChoice = pick(p.view, ['story', 'managers'] as const) ?? 'managers';
    this.page = pick(p.p, PAGES.map((x) => x.id)) ?? 'overview';
    this.gran = pick(p.g, ['auto', 'week', 'month', 'term'] as const) ?? 'auto';
    this.view = pick(p.v, ['weekly', 'cumulative', 'rate'] as const) ?? 'weekly';
    this.lastYear = p.ly === '1';
    this.compare = pick(p.c, COMPARE_MODES) ?? 'none';
    this.focus = pick(p.f, FOCUS_CHOICES.map((x) => x.id)) ?? 'range';
    const days = (a?: string, b?: string): [number, number] | null => {
      const x = a ? isoToDay(a) : NaN;
      const y = b ? isoToDay(b) : NaN;
      return Number.isFinite(x) && Number.isFinite(y) ? [Math.min(x, y), Math.max(x, y)] : null;
    };
    this.customA = days(p.af, p.at);
    this.customB = days(p.bf, p.bt);
    if (this.focus === 'custom' && !this.customA) this.focus = 'range';
    if (this.compare === 'custom' && !this.customB) this.compare = 'prev';
    const preset = pick(p.r, PRESETS.map((x) => x.id)) ?? 'ytd';
    const from = p.from ? isoToDay(p.from) : NaN;
    const to = p.to ? isoToDay(p.to) : NaN;
    if (preset === 'custom' && Number.isFinite(from) && Number.isFinite(to)) this.setCustom(from, to);
    else {
      this.preset = preset === 'custom' ? 'ytd' : preset;
      this.presetChosen = !!p.r && preset !== 'custom';
    }
  }
}

export const app = new AppState();
