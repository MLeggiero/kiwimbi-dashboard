// Words and photos for the impact story. Edit here: the page reads everything from this file.
//
// Sources: kiwimbi.org (What We Do, Food for Thought, the home page), rewritten to be short
// and current. Claims about the old KCPE exam are left out (Kenya has since replaced it).
// This file is public copy only: never put program data, names of staff or children, or
// links to Kiwimbi's documents here.

import type { MetricId } from '../shared/types';

const UPLOADS = 'https://kiwimbi.org/wp-content/uploads/';

export interface Photo {
  src: string;
  /** Larger and smaller renditions for sharp images on every screen. */
  srcset?: string;
  alt: string;
  caption: string;
  /** Where to keep the frame when a photo is cropped (CSS object-position). */
  focus?: string;
}

/** A wide slide from the kiwimbi.org home page, in the three sizes the site publishes. */
const slide = (n: number, alt: string, caption: string, focus?: string): Photo => ({
  src: `${UPLOADS}2024/02/Slide-${n}-1200x480.jpg`,
  srcset: `${UPLOADS}2024/02/Slide-${n}-800x320.jpg 800w, ${UPLOADS}2024/02/Slide-${n}-1200x480.jpg 1200w, ${UPLOADS}2024/02/Slide-${n}.jpg 2500w`,
  alt,
  caption,
  focus,
});

export const LOGO = {
  src: `${UPLOADS}2023/03/Kwimbi-logo-alone.png`,
  srcset: `${UPLOADS}2023/03/Kwimbi-logo-alone-200x121.png 200w, ${UPLOADS}2023/03/Kwimbi-logo-alone.png 258w`,
  alt: 'Kiwimbi',
};

export const SITE = 'https://kiwimbi.org/';

export const PHOTOS = {
  hero: slide(3, 'Two smiling girls eat lunch from plates at school', 'Lunchtime.', '50% 40%'),
  lunch: {
    src: `${UPLOADS}2019/01/2d331901-e0be-42bc-b142-76732148a394.jpg`,
    alt: 'Students in school uniforms eat lunch together in the shade of a tree',
    caption: 'Lunch in the shade.',
  } satisfies Photo,
  mentoring: slide(2, 'A mentor leans over a table to help a small group of boys with their work', 'A mentor with a small group.', '40% 45%'),
  reading: slide(4, 'A boy in glasses reads a book', 'Reading time.', '30% 40%'),
  tailoring: slide(8, 'A tailoring student smiles while working at a sewing machine', 'Tailoring class.', '45% 40%'),
  carpentry: slide(6, 'A carpenter works at a bench in the Kiwimbi carpentry workshop', 'The carpentry workshop.', '50% 50%'),
  art: {
    src: `${UPLOADS}2020/11/art-lesson-IMG_5158-1200x800.jpg`,
    srcset: `${UPLOADS}2020/11/art-lesson-IMG_5158-800x533.jpg 800w, ${UPLOADS}2020/11/art-lesson-IMG_5158-1200x800.jpg 1200w`,
    alt: 'Students at benches during an art lesson in a courtyard with blue walls',
    caption: 'An art lesson.',
  } satisfies Photo,
  garden: {
    src: `${UPLOADS}2023/06/kale-IMG_5450-1-1200x800.jpg`,
    srcset: `${UPLOADS}2023/06/kale-IMG_5450-1-800x533.jpg 800w, ${UPLOADS}2023/06/kale-IMG_5450-1-1200x800.jpg 1200w`,
    alt: 'Rows of young kale plants growing in red soil',
    caption: 'A kitchen garden.',
  } satisfies Photo,
  camp: slide(1, 'Children read and write on the ground in the shade outside a blue building', 'Learning outdoors.', '50% 55%'),
};

export const MISSION = {
  region: 'Busia County, western Kenya',
  ripple: 'Kiwimbi means “ripple” in Swahili.',
};

export const SCHOOLS_SENTENCE = 'Amagoro, Kidek and Ikapolok primary schools';

/**
 * The notice on the story and in the printed report: what these figures are, and are not.
 * Legal wording: change it with care, and keep the organization's legal name exact.
 */
export const DATA_NOTICE = {
  title: 'Notice about these figures',
  /** One line where the numbers appear, and on every printed page. */
  short: 'Unaudited figures, subject to correction.',
  paragraphs: [
    'Kiwimbi International provides these figures for general information and reference only. They are compiled from program reports by Kiwimbi staff and mentors in Kenya, are unaudited and not independently verified, and may be incomplete, estimated or provisional.',
    'Kiwimbi International may correct, revise or withdraw any figure at any time without notice. A printed, saved or shared copy shows the figures on the date it was prepared, and Kiwimbi’s most recent figures replace it.',
    'These figures are not a financial statement, audit, grant or compliance report, certification, or legal statement of any kind, and they do not create, amend or form part of any agreement, commitment or obligation. They are provided “as is”, without representation or warranty of any kind, express or implied, including as to accuracy, completeness or fitness for any purpose.',
    'Do not rely on them for any legal, financial, funding or contractual decision without written confirmation from Kiwimbi International. To the fullest extent permitted by law, Kiwimbi International and its directors, officers, staff, volunteers and partners accept no liability for any loss or damage arising from any use of, or reliance on, them.',
    'Do not alter these figures or present them out of context. When sharing them, include this notice and the date they were prepared.',
  ],
};

export const MEALS = {
  kicker: 'School lunches',
  title: 'No one learns on an empty stomach',
  body: 'Some pupils live miles from school. A lunch at school means no long walk home at midday for a meal that may not be there, and an afternoon spent learning.',
};

export const LIBRARY = {
  kicker: 'The Kiwimbi Library',
  title: 'The first free public library in Busia County',
  body: 'Opened in Amagoro in 2013, it holds more than 20,000 books, and satellite libraries bring reading material to children in 93 schools.',
};

export const MENTORING = {
  kicker: 'Prep for Success',
  title: 'Small groups, taught at the right level',
  body: 'A class can reach 80 children for one teacher. Kiwimbi mentors split it into small groups and teach reading and math at each group’s level (Teaching at the Right Level).',
};

export const PROGRAMS = {
  kicker: 'Skills, arts and the land',
  title: 'Room to make, play and grow',
  body: 'Trades, art, sport, computers, holiday camps and kitchen gardens.',
};

export interface ProgramCopy {
  metric: MetricId;
  name: string;
  text: string;
  photo?: Photo;
}

export const PROGRAM_COPY: ProgramCopy[] = [
  { metric: 'tailoring', name: 'Tailoring', text: 'Sewing and mending toward Kenya’s national practical exam.' },
  { metric: 'carpentry', name: 'Carpentry', text: 'Chairs for the Library, repairs for local schools.', photo: PHOTOS.carpentry },
  { metric: 'art', name: 'Art', text: 'Painting, pottery and Teso weaving, beading and dance.', photo: PHOTOS.art },
  { metric: 'agronomy_attendees', name: 'Kitchen gardens', text: 'Indigenous vegetables and drought-resistant crops.', photo: PHOTOS.garden },
  { metric: 'holiday_camp', name: 'Holiday camps', text: 'Learning at the Library while school is out.', photo: PHOTOS.camp },
  { metric: 'computer_lab', name: 'Computer lab', text: 'Hands-on computer and STEM learning.' },
  { metric: 'sports', name: 'Sports', text: 'Organized sport and play.' },
];

/**
 * "How we count": written for staff who haven't seen the data behind the page. Keep every
 * statement in step with the code (shared/pipeline.ts, src/lib/dataset.ts, src/lib/series.ts).
 */
export const HOW_WE_COUNT = {
  intro:
    'Every number on this page comes from reports that Kiwimbi staff and mentors in Kenya send through the Kiwimbi Kenya data form (a Google Form). Nothing is typed into this page by hand. Here is what happens between a report and the figures you see.',
  steps: [
    {
      title: 'Someone in Kenya sends a report',
      text: 'Each report gives a number (for example, meals served at Kidek), what it counts, and the dates it covers: a start date and an end date. Most reports cover one school week (Monday to Friday).',
    },
    {
      title: 'The number is placed on the days it happened',
      text: 'Figures follow the dates the activity took place, not the day the form was sent. A report is spread evenly across the days it covers: school days for school programs (meals, the library, mentoring, the computer lab) and every day for programs that also run at weekends or during breaks (sports, art, tailoring, carpentry, holiday camps, kitchen gardens). A report covering three weeks shows as three steady weeks, not one spike.',
    },
    {
      title: 'Days are added up',
      text: 'Weekly and monthly figures, running totals and the totals for any dates you pick on the timeline are all sums of those days.',
    },
    {
      title: 'Only the current round of reporting',
      text: 'The page starts on the day the current round of reporting began (shown on the timeline). Reports from before then are not counted, and a report that runs across that day only counts its share from that day on.',
    },
    {
      title: 'The page stays up to date',
      text: 'The page reads the latest reports every few minutes, so a new report usually appears within about ten minutes. Reports often arrive a few days after the week they describe, so the last two weeks are drawn paler and may still go up.',
    },
  ],
  reading: [
    {
      term: 'A gap in a chart',
      text: 'No report arrived for that week or month. It is shown as a gap, never as zero, because it could be a school break or a report that hasn’t been sent. Shaded bands mark known school breaks.',
    },
    {
      term: 'On an average school day',
      text: 'The total divided by the weekdays that have reports. Weekends and school breaks don’t count, so it shows a normal day of service.',
    },
    {
      term: 'In a typical week (programs)',
      text: 'The middle value of the program’s one-week reports: roughly how many students take part in a usual week, without one unusually busy or quiet week pulling it up or down.',
    },
  ],
  measures: [
    { tone: 'sun', term: 'Lunches (school meals)', text: `Meals served to pupils at ${SCHOOLS_SENTENCE}, reported for each school. Meals for staff and tailoring students are recorded separately and are not part of this count.` },
    { tone: 'water', term: 'Library visits', text: 'Visits to the Kiwimbi Library in Amagoro, as reported by the Library. One person who comes twice counts as two visits.' },
    { tone: 'coral', term: 'Books borrowed', text: 'Books checked out of the Library. “One book for every 2 visits” compares books borrowed with visits over the same dates.' },
    { tone: 'leaf', term: 'Classes taught', text: 'Lessons led by Kiwimbi mentors in primary and secondary schools, as reported on the form.' },
    { tone: 'teal', term: 'Attendances (skills programs)', text: 'One student at one session. If 20 students come to art every week for 4 weeks, that is 80 attendances. Used for sports, art, tailoring, carpentry, the computer lab, holiday camps and kitchen gardens.' },
    { tone: 'earth', term: 'Kitchen-garden workshops', text: 'The number of agronomy (kitchen-garden) workshops held. Their attendees are counted with the other programs.' },
  ],
  caveats: [
    'The figures are only as complete as the reports. If a school or mentor misses a week, that week is missing from the totals, so real activity can be higher than shown.',
    'Spreading a report across its dates estimates how the work fell day by day. Weekly and monthly totals are exact sums of the reports; daily figures are estimates.',
    'When a report is corrected in the sheet, the page updates within minutes, so past figures can shift slightly.',
    'Questions about a number? The dashboard managers can trace every figure back to the report behind it.',
  ],
};
