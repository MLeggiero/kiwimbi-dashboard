import { BOOK_LOCATIONS, UNSPLIT_BOOKS_LABEL } from '../../shared/metrics';
import type { BookLocation } from '../../shared/types';
import type { SeriesSpec } from '../charts/timeseries';
import { mixHex } from '../charts/common';
import { locKey } from './dataset';
import { rangeStats } from './series';
import type { ViewContext } from './view';

// Books checked out are split by location from 2026-10-22: the main library, satellite
// libraries, outreach schools and the KLC. Earlier reports are "all locations (not split)".

const PLACES: { id: BookLocation | 'unsplit'; label: string }[] = [...BOOK_LOCATIONS, { id: 'unsplit', label: UNSPLIT_BOOKS_LABEL }];

/**
 * One stacked bar of books per period, by location, in tints of the books color (main library
 * the deepest). Locations with nothing reported in the range are left out.
 */
export function bookSeries(ctx: ViewContext, color: string): SeriesSpec[] {
  const t = ctx.theme;
  const shade: Record<BookLocation | 'unsplit', string> = {
    main: mixHex(color, t.ink, 0.22),
    satellite: mixHex(color, t.card, 0.3),
    outreach: mixHex(color, t.card, 0.5),
    klc: mixHex(color, t.card, 0.68),
    unsplit: color,
  };
  return PLACES.filter((p) => rangeStats(ctx.ds, [locKey(p.id)], ctx.from, ctx.to).coveredDays > 0).map((p) => ({
    name: p.id === 'unsplit' ? `Books: ${p.label.toLowerCase()}` : `Books: ${p.label}`,
    color: shade[p.id],
    metrics: [locKey(p.id)],
    stack: 'books',
  }));
}
