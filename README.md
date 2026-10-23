# Kiwimbi Impact

A private, internal impact site for Kiwimbi's Kenya programs (school lunches, the library, mentoring,
skills programs), built as a **Google Apps Script web app**. It reads the "Kiwimbi Kenya Data Submission"
Google Sheet and is only visible to signed-in Kiwimbi Google accounts.

- **The story** (everyone signed in): photos, short program descriptions and a few clear numbers for any
  stretch of time (this year, this term, the last 4 or 12 weeks, last year, since reporting began, or custom
  dates and a draggable timeline). Words and photos live in `src/content.ts`.
- **The dashboard** (people in `MANAGER_EMAILS`, who land here and can switch to the story): each page
  opens with highlights in plain words (last week, last month and the year so far, each against the
  period before, with school breaks explained), then one labelled date control and a few explanatory
  charts, each titled with its takeaway ("Ikapolok grew most (+26%)"). Chart options and a "Compare two
  periods" tool are folded away under the dates. Staff and tailoring meals are on the Meals page. Checks
  on the reports themselves (report counts, who reported, rows to fix) are on **Data health** only.

**This repository contains code only. It never contains data, spreadsheet IDs or credentials.**
Anyone can fork it without getting access to anything.

```
 Google Form ──► Google Sheet ("Form Responses")
                      │  read with the owner's permission, inside Google
                      ▼
          Apps Script (this repo, built into Code.js)
          · checks who is asking (kiwimbi.org accounts only)
          · cleans and checks every row, drops names and links
          · caches the result for a few minutes
                      │
                      ▼
          Dashboard page (index.html) in the viewer's browser
```

## Security model

| Question | Answer |
|---|---|
| Who can open it? | Google requires sign-in before the page loads. The deployment is limited to **kiwimbi.org accounts**, and the server re-checks every request against `ALLOWED_DOMAIN` / `ALLOWED_EMAILS`. It fails closed: no visible identity, or no access list configured, means no access. |
| Do viewers need access to the spreadsheet? | No. The script reads the sheet as its owner. After switching over, remove dashboard viewers from the sheet's sharing list. |
| What reaches a viewer's browser? | Numbers, dates and program names only. **No reporter names, per-person IDs, row numbers, photo links or free text.** "Mentors reporting" is counted on the server for fixed periods (each week, month, term and preset range), so nobody can rebuild one person's schedule from the page. Staff and tailoring meals and the data-check counts (reports used, left out, flagged) are sent to managers only. |
| Who sees names? | Only addresses in `MANAGER_EMAILS`, on the **Data health** page (who reported, rows to fix). Names travel only in the manager-only data (`getOpsData`). |
| Downloads | Table views and CSV/PNG downloads are in the managers' view only. |
| Where are the secrets? | In the Apps Script project's **Script Properties** (sheet ID, access lists) and a hashing key the script creates itself. `.clasp.json` (which names your script project) is git-ignored. |
| What guards the repo? | A no-data guard runs **before every commit and push** (git hooks installed by `npm install`), before `npm run push`, and in CI. It blocks spreadsheets, CSV/HAR/PDF files, Drive shortcuts, dashboard exports, credential and key files, Google API keys, document links and bare document IDs. Optionally, put real names and the sheet ID in `~/.kiwimbi-guard-denylist`, **outside the repo**, one per line; the guard then blocks those too, without printing them. Also turn on GitHub secret scanning with push protection for the repository. |
| What keeps it safe to operate? | A standalone script, not one attached to the sheet (otherwise every sheet editor could edit it); a Kiwimbi-owned owner account with 2-step verification; **only managers as editors of the Apps Script project** (its server-side cache holds names); deploy from a trusted computer (no Google credentials in GitHub). |

Only six server functions exist at the top level of `Code.js`. Anything else is private and can't be
called from a browser. `checkSetup` and `installTriggers` run only from the Apps Script editor, by an
account listed in `MANAGER_EMAILS`. `refreshCache` answers only its trigger or signed-in viewers, returns
no data, and rebuilds at most once a minute.

## One-time setup (about 30 minutes)

You need Node.js 22 or newer and a **kiwimbi.org Google account** that can view the responses sheet.
That account becomes the script's owner, so ideally use a shared admin or data account rather than a personal one.

1. **Install:** `npm install`
2. **Turn on the Apps Script API** for that account at <https://script.google.com/home/usersettings>.
3. **Sign in clasp** (Google's command-line tool for Apps Script): `npx clasp login`. A browser window opens and you sign in there. The token is stored in your user folder, not in this repo.
4. **Create the script project:**
   ```
   npx clasp create-script --type standalone --title "Kiwimbi Impact" --rootDir dist-gas
   ```
   This writes `.clasp.json` (git-ignored). If you create the project in the Apps Script website instead, copy `.clasp.json.example` to `.clasp.json` and paste the script ID.
5. **Build and upload:** `npm run push`
6. **Add Script Properties:** run `npx clasp open-script`, then open Project Settings, then Script Properties. At minimum:
   - `SHEET_ID`: the long ID in the sheet's address (between `/d/` and `/edit`)
   - `ALLOWED_DOMAIN`: `kiwimbi.org`
   - `MANAGER_EMAILS`: comma-separated addresses that may see the Data health page. **Include the account you
     use for maintenance**, since `checkSetup` and `installTriggers` only run for managers.
7. **Check the setup:** in the editor, choose `checkSetup`, click Run, and approve the permissions (read-only Sheets, your email address, triggers). The log should show only `OK` lines, plus counts. It never prints data.
8. **Keep data fresh:** run `installTriggers` once. It refreshes the cache every 5 minutes.
9. **Deploy:** click Deploy, then New deployment, then Web app. Set Execute as: *Me*; Who has access: *Anyone within kiwimbi.org* (these are also the defaults in `appsscript.json`). Copy the `/exec` link and share it with viewers.
10. **Test it:**
    - The link loads for a kiwimbi.org account.
    - In a private window with a personal Gmail account, Google refuses.
    - A colleague who isn't a manager doesn't see Data health.

## Updating

Each deployment serves a fixed version of the code: uploading new code does **not** change what the link
shows until that deployment is moved to a new version. (A *New deployment* makes a second link and leaves
the old one on the old version; archive extra deployments so there is only one link.)

One step, once set up:

```
npm run deploy
```

It runs the checks, uploads the code, saves a new version and points the existing deployment at it. The
first time, pass the deployment ID (from `npx clasp list-deployments`: the part of the link between `/s/`
and `/exec`): `npm run deploy -- <deploymentId>`. It is saved in `.clasp-deployment` (git-ignored) for next
time. If clasp reports `invalid_grant`, run `npx clasp login` and try again.

By hand instead: `npm run push`, then in the Apps Script editor open Deploy, then Manage deployments, then
the pencil icon on the deployment people use. Set Version to *New version* and click Deploy. Reload open tabs.

## Settings (Script Properties)

| Property | Required | Meaning |
|---|---|---|
| `SHEET_ID` | yes | The responses spreadsheet |
| `ALLOWED_DOMAIN` | yes* | Viewers must sign in with an address at this domain, e.g. `kiwimbi.org` |
| `ALLOWED_EMAILS` | no | If set, only these addresses (plus managers) may view |
| `MANAGER_EMAILS` | yes | May see reporter names, the Data health page and downloads |
| `RESPONSES_TAB` | no | Default `Form Responses` |
| `NAME_MAP_TAB` | no | Default `Name Mappings` (canonical name in column A, comma-separated variations in B) |
| `TERMS_TAB` | no | Default `Dashboard Terms` |
| `TARGETS_TAB` | no | Default `Dashboard Targets` |
| `DATA_START` | no | `YYYY-MM-DD`. The first day the dashboard covers (the start of the current round of reporting). Earlier reports, rows and issues are left out everywhere; a report that runs across the day keeps only its share from that day on. `checkSetup` reports how many were left out. |
| `CACHE_SECONDS` | no | Default 600 |
| `TIMEZONE` | no | Default `Africa/Nairobi`; defines "today" for year to date |
| `NAME_HASH_KEY` | auto | Created by the script. Don't share it; changing it re-keys the anonymous reporter IDs |

\* Set `ALLOWED_DOMAIN`, `ALLOWED_EMAILS` or both. With neither, only managers get in.

### Optional tabs in the sheet

- **Dashboard Terms**: `Term | Start date | End date` (e.g. `Term 3 2026 | 2026-08-24 | 2026-10-30`).
  Turns on school-break shading, the *This term* range, bars by term, and the notes that explain a
  change when a week or month falls in a school break ("August was mostly a school break").
- **Dashboard Targets**: `Metric or program | Year | Target` (e.g. `meals | 2026 | 90000`).
  Adds a target pace line to the *this year vs last year* charts. Keys: `meals` (meals served),
  `library` (library visits), `mentorship` (classes taught).

## Printing

**Print report** (top of the story; also on the dashboard) prints an impact report for the dates
chosen on the timeline: headline numbers, a short section per program with charts, how the numbers
are counted and the notice about these figures. In the print window choose a printer, or **Save as PDF**. Printing the story with the
browser's own Print command (Ctrl+P / Cmd+P) gives the same report. The charts are vector drawings
in fixed print colors, so they stay sharp and print in color whatever the browser's settings or theme.
On the dashboard, the printer icon prints the page on screen instead. The report is in `src/print/`.

**Notice about these figures.** The story (at the foot of the page, linked from the headline numbers)
and every printed report carry a notice: the figures are unaudited, for reference only, may be corrected
at any time, and are not a legal or financial statement. Each printed page also says "Unaudited figures,
subject to correction". The wording is `DATA_NOTICE` in `src/content.ts` (the per-page line is also in
`src/app.css`); have it reviewed before relying on it.

## How the numbers are made

- **Lunches are the three partner schools** (Amagoro, Kidek, Ikapolok). Staff and tailoring meals are
  shown separately on the managers' Meals page and never added to the lunch count.
- **Activity dates, not submission dates.** Each report covers a date range. Its value is spread evenly across the school days it covers (every day for camps and weekend programs), then added up by week, month or term. A report covering eleven weeks shows as eleven steady weeks, not a one-month spike. Totals never change.
- **No report is not zero.** Weeks without reports are hatched and trend lines break there. School breaks (from the Terms tab) are shaded.
- **The last two weeks are provisional.** Reports usually arrive within a few days, so recent weeks are drawn lighter or dotted.
- **Every row is checked** (`shared/pipeline.ts`):
  - test submissions are dropped
  - reporter names are matched through the Name Mappings tab
  - numbers must be plain numbers (text like "20-25" is rejected, never digit-stripped)
  - impossible or typo dates are rejected
  - missing dates are inferred from the same submission when possible and flagged
  - exact repeat submissions are dropped
  - overlapping reports and likely duplicates are flagged for review

  Managers see every flag, with a link to the row, on the Data health page.
- **If a form question is renamed**, update the matching header in `shared/headers.ts`. The Data health page lists any column the dashboard doesn't recognize.

## Local development

```
npm run dev      # http://localhost:5173 with synthetic data (never real data)
npm test         # unit tests, plus the real Code.js bundle run against simulated Google services
npm run check    # type checks
npm run verify   # guard + check + test + build: run before pushing
```

Local preview options: `?role=viewer` (as a non-manager), `?view=story` (the story, as a manager), `?start=YYYY-MM-DD` (preview a `DATA_START`), `?fail=1` (error state).

The story loads the Kiwimbi logo and program photos from kiwimbi.org's public media library (no data is
sent; the page sets `no-referrer`). If kiwimbi.org is unreachable, the page shows the name in type and
keeps each photo's space.
The synthetic data lives in `dev/fake-sheet.ts` and is stripped from production builds (`npm run build` checks this).

```
server/     Apps Script entry points, access checks, sheet reading, cache
shared/     Metric catalog, form-header mapping, cleaning pipeline, payload builders
src/        Dashboard (Svelte 5 + Apache ECharts), built into one HTML file
dev/        Synthetic sheet + mock server for local development and tests
scripts/    Server build, build checks, no-data guard
tests/      Vitest suites
docs/       PLAN.md, the design and decision record
```

## Troubleshooting

- **"The Google Sheets API service is not enabled" or "Sheets API has not been used in project…":** the script reads the sheet through the Sheets API (read-only), which `appsscript.json` turns on. If Google still reports it off, open the editor, click **+** next to *Services*, choose **Google Sheets API**, click **Add**, and run `checkSetup` again.
- **"Specified permissions are not sufficient to call SpreadsheetApp.openById":** you're running an older build. Run `npm run push`, reload the editor, and try again.
- **"No access" page for a Kiwimbi colleague:** check `ALLOWED_EMAILS` (if set) and that they're signed in with their kiwimbi.org account. People with several Google accounts in one browser should use a separate browser profile or a private window.
- **A gray "This application was created by a Google Apps Script user" bar:** Google adds this to Apps Script web apps. It can't be removed from inside the app.
- **Numbers look stale:** run `checkSetup` in the editor. It reports whether the refresh trigger is installed.
- **A chart shows a spike or dip that looks wrong:** open Data health and check the rows flagged for that program and week, then fix them in the sheet. Changes appear within about 5 minutes.
