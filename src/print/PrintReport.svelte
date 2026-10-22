<script lang="ts">
  // The printable impact report: what "Print report" (and printing the story with the
  // browser's own Print command) puts on paper or in a PDF. Built for A4 and US Letter
  // pages, with fixed print colors and vector charts, for the dates chosen on the timeline.
  // Like the story, it has no names and no report counts.
  import { MEAL_SCHOOLS, METRIC_BY_ID } from '../../shared/metrics';
  import { dayParts, fmtDay, fmtRange, monthName } from '../../shared/dates';
  import { DATA_NOTICE, LIBRARY, LOGO, MEALS, MENTORING, MISSION, PHOTOS, PROGRAM_COPY, PROGRAMS, SCHOOLS_SENTENCE } from '../content';
  import { fmtInt, fmtOne } from '../lib/format';
  import { aggregate, autoGranularity, makeBuckets, type Bucket } from '../lib/series';
  import { app } from '../lib/state.svelte';
  import { buildStory } from '../lib/story';
  import PrintBars from './PrintBars.svelte';
  import PrintHBars from './PrintHBars.svelte';

  const C = { lunch: '#a84830', school: ['#a84830', '#be8b25', '#09a0a0'], water: '#0a6a93', leaf: '#4a7314', teal: '#08706f', coral: '#b1302e' };

  const ds = $derived(app.data!);
  const story = $derived(buildStory(ds, app.activePreset, app.range[0], app.range[1]));
  const p = $derived(story.period);
  const g = $derived(autoGranularity(p.from, p.to));
  const word = $derived(g === 'week' ? 'week' : 'month');
  const buckets = $derived(makeBuckets(p.from, p.to, g, ds.terms));
  const values = (metrics: Parameters<typeof aggregate>[1]) => aggregate(ds, metrics, buckets).values;

  /** Month names under the first column of each month. */
  const monthLabels = (bs: Bucket[]) => {
    let prev = -1;
    return bs.map((b) => {
      const { y, m } = dayParts(b.start);
      if (y * 12 + m === prev) return '';
      prev = y * 12 + m;
      return monthName(m);
    });
  };
  const labels = $derived(monthLabels(buckets));

  const ratio = $derived(story.booksPerVisit);
  const ratioText = $derived(ratio === null || ratio <= 0 ? '' : ratio >= 1 ? `${fmtOne(ratio)} per visit` : `one for every ${Math.round(1 / ratio)} visits`);
  const running = $derived(story.programs.filter((x) => x.total));
  const attendances = $derived(running.reduce((a, x) => a + (x.total ?? 0), 0));
  const when = $derived(`${p.phrase[0].toUpperCase()}${p.phrase.slice(1)}`);

  const numbers = $derived(
    [
      { value: story.meals.total, label: 'lunches served', note: story.meals.perSchoolDay ? `About ${fmtInt(story.meals.perSchoolDay)} a school day` : '', color: C.lunch },
      { value: story.visits.total, label: 'library visits', note: story.visits.perSchoolDay ? `About ${fmtInt(story.visits.perSchoolDay)} a school day` : '', color: C.water },
      { value: story.books.total, label: 'books borrowed', note: ratioText ? `${ratioText[0].toUpperCase()}${ratioText.slice(1)}` : '', color: C.coral },
      { value: story.classes.total, label: 'classes taught', note: story.classes.total ? `${fmtInt(story.primary)} primary, ${fmtInt(story.secondary)} secondary` : '', color: C.leaf },
      { value: attendances || null, label: 'program attendances', note: running.length ? `Across ${running.length} skills program${running.length === 1 ? '' : 's'}` : '', color: C.teal },
    ].filter((x) => x.value !== null),
  );

  const schools = $derived(story.schools.map((s, i) => ({ label: s.label, value: Math.round(s.value), color: C.school[i] })));
  const programs = $derived(
    PROGRAM_COPY.map((c) => ({ c, s: story.programs.find((x) => x.id === c.metric) }))
      .filter((x) => x.s?.total)
      .map(({ c, s }) => ({ label: c.name, value: Math.round(s!.total!), note: s!.typical ? `about ${fmtInt(s!.typical)} a week` : '', color: C.teal }))
      .sort((a, b) => b.value - a.value),
  );
  const lunchesWeekly = $derived(values(MEAL_SCHOOLS));
  const visitsWeekly = $derived(values(['library_visits']));
  const primaryWeekly = $derived(values(['classes_primary']));
  const secondaryWeekly = $derived(values(['classes_secondary']));
</script>

<article class="print-report" aria-label="Printable impact report">
  <header class="head">
    <img class="logo" src={LOGO.src} alt={LOGO.alt} referrerpolicy="no-referrer" />
    <div>
      <p class="eyebrow">Kiwimbi Kenya programs · Impact report</p>
      <h1>{p.label}</h1>
      <p class="meta">{fmtRange(p.from, p.to)} · {MISSION.region} · Prepared {fmtDay(ds.today)} · {DATA_NOTICE.short}</p>
    </div>
  </header>

  <img class="photo" src={PHOTOS.hero.src} alt={PHOTOS.hero.alt} referrerpolicy="no-referrer" style:object-position={PHOTOS.hero.focus} />

  {#if numbers.length}
    <p class="lead">
      {when}, Kiwimbi’s programs {#if story.meals.total}served <strong>{fmtInt(story.meals.total)}</strong> school lunches{/if}{#if story.visits.total}{story.meals.total ? ', ' : ''}welcomed <strong>{fmtInt(story.visits.total)}</strong> library visits{/if}{#if story.classes.total}{story.meals.total || story.visits.total ? ' and ' : ''}taught <strong>{fmtInt(story.classes.total)}</strong> small-group classes{/if}.
    </p>
    <div class="numbers">
      {#each numbers as n (n.label)}
        <div class="num" style:border-top-color={n.color}>
          <div class="v">{fmtInt(n.value)}</div>
          <div class="l">{n.label}</div>
          {#if n.note}<div class="s">{n.note}</div>{/if}
        </div>
      {/each}
    </div>
  {:else}
    <p class="lead">No activity was reported for these dates.</p>
  {/if}

  {#if story.meals.total}
    <section>
      <h2><span class="dot" style:background={C.lunch}></span>{MEALS.title}</h2>
      <p>{MEALS.body} Lunches at {SCHOOLS_SENTENCE}.</p>
      <h3>Lunches each {word}</h3>
      <PrintBars series={[{ name: 'Lunches', color: C.lunch, values: lunchesWeekly }]} {labels} period={word} label="Lunches served each {word}" />
      <h3>At each school</h3>
      <PrintHBars rows={schools} label="Lunches served at each school" />
    </section>
  {/if}

  {#if story.visits.total || story.books.total}
    <section>
      <h2><span class="dot" style:background={C.water}></span>{LIBRARY.title}</h2>
      <p>{LIBRARY.body}</p>
      {#if story.visits.total}
        <h3>Library visits each {word}</h3>
        <PrintBars series={[{ name: 'Visits', color: C.water, values: visitsWeekly }]} {labels} period={word} label="Library visits each {word}" height={130} />
      {/if}
    </section>
  {/if}

  {#if story.classes.total}
    <section>
      <h2><span class="dot" style:background={C.leaf}></span>{MENTORING.title}</h2>
      <p>{MENTORING.body}</p>
      <h3>Classes each {word} <span class="key"><span class="sw" style:background={C.leaf}></span>Primary <span class="sw" style:background={C.teal}></span>Secondary</span></h3>
      <PrintBars
        series={[
          { name: 'Primary', color: C.leaf, values: primaryWeekly },
          { name: 'Secondary', color: C.teal, values: secondaryWeekly },
        ]}
        {labels}
        period={word}
        label="Classes taught each {word}, primary and secondary"
        height={130}
      />
    </section>
  {/if}

  {#if programs.length}
    <section>
      <h2><span class="dot" style:background={C.teal}></span>{PROGRAMS.title}</h2>
      <p>{PROGRAMS.body} Attendances count one student at one session; “a week” is how many students usually take part.</p>
      <PrintHBars rows={programs} label="Attendances by program" />
      {#if story.workshops}<p class="small">{fmtInt(story.workshops)} kitchen-garden workshop{story.workshops === 1 ? '' : 's'} held.</p>{/if}
    </section>
  {/if}

  <section class="notes">
    <h3>How these numbers are counted</h3>
    <ul>
      <li>Kiwimbi staff and mentors in Kenya report each activity through the Kiwimbi Kenya data form, with the dates it covers.</li>
      <li>Each report is spread evenly across the days it covers (school days for school programs) and then added up by {word}. A gap in a chart means no report for that {word}.</li>
      <li>This report covers {fmtRange(p.from, p.to)}, within the current round of reporting. The last two weeks can still grow as late reports arrive.</li>
      <li>Lunches are meals served to pupils at {SCHOOLS_SENTENCE}. {METRIC_BY_ID.meals_staff_tailoring.label} are not included.</li>
    </ul>
  </section>

  <section class="legal">
    <h3>{DATA_NOTICE.title}</h3>
    {#each DATA_NOTICE.paragraphs as text, i (i)}<p>{text}</p>{/each}
  </section>

  <footer class="foot">Kiwimbi International · kiwimbi.org · {MISSION.ripple}</footer>
</article>

<style>
  .print-report {
    display: none;
    font-family: 'Open Sans', Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.45;
    color: #1c2420;
    background: #ffffff;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 6mm;
    padding-bottom: 4mm;
    border-bottom: 2px solid #1c2420;
  }
  .logo {
    height: 17mm;
    width: auto;
  }
  .eyebrow {
    margin: 0;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #8f3a24;
  }
  h1 {
    margin: 1mm 0 0;
    font-size: 26pt;
    font-weight: 800;
    font-stretch: 75%;
    letter-spacing: -0.01em;
    line-height: 1;
    color: #1c2420;
  }
  .meta {
    margin: 1.5mm 0 0;
    font-size: 9pt;
    color: #48534e;
  }
  .photo {
    display: block;
    width: 100%;
    height: 52mm;
    object-fit: cover;
    margin-top: 4mm;
  }
  .lead {
    margin: 4mm 0 0;
    font-size: 11.5pt;
    line-height: 1.45;
  }
  .numbers {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4mm 6mm;
    margin-top: 4mm;
  }
  .num {
    border-top: 3px solid;
    padding-top: 1.5mm;
    break-inside: avoid;
  }
  .v {
    font-size: 22pt;
    font-weight: 800;
    font-stretch: 75%;
    line-height: 1.05;
  }
  .l {
    font-size: 9pt;
    font-weight: 700;
  }
  .s {
    font-size: 8.5pt;
    color: #48534e;
  }
  section {
    margin-top: 7mm;
    break-inside: avoid;
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 2.5mm;
    margin: 0 0 1.5mm;
    font-size: 15pt;
    font-weight: 800;
    font-stretch: 75%;
    color: #1c2420;
  }
  .dot {
    display: inline-block;
    width: 3mm;
    height: 3mm;
    border-radius: 50%;
  }
  h3 {
    margin: 3mm 0 1mm;
    font-size: 9.5pt;
    font-weight: 700;
    font-stretch: normal;
    color: #1c2420;
  }
  section p {
    margin: 0;
    font-size: 9.5pt;
    color: #48534e;
    max-width: 165mm;
  }
  .small {
    margin-top: 1.5mm !important;
    font-size: 8.5pt !important;
  }
  .key {
    margin-left: 3mm;
    font-weight: 400;
    color: #48534e;
  }
  .sw {
    display: inline-block;
    width: 2.5mm;
    height: 2.5mm;
    margin: 0 1mm 0 2mm;
    vertical-align: baseline;
  }
  .notes {
    padding-top: 3mm;
    border-top: 1px solid #d9d3c4;
  }
  .notes h3 {
    margin-top: 0;
  }
  .notes ul {
    margin: 0;
    padding-left: 4.5mm;
    font-size: 8.5pt;
    color: #48534e;
  }
  .legal {
    margin-top: 5mm;
    padding-top: 3mm;
    border-top: 1px solid #d9d3c4;
  }
  .legal h3 {
    margin-top: 0;
  }
  .legal p {
    margin: 0 0 1.5mm;
    font-size: 8.5pt;
    line-height: 1.45;
  }
  .foot {
    margin-top: 6mm;
    padding-top: 2mm;
    border-top: 1px solid #d9d3c4;
    font-size: 8pt;
    color: #5f6963;
  }
</style>
