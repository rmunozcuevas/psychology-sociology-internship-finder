# Path49 — psychology & sociology internship finder

The name is a nod to Charlotte’s 49ers; the project is independently run.

An independent, public directory for psychology and sociology undergraduates, wherever they study. Path49 is not affiliated with or endorsed by UNC Charlotte or Niner Software. Browse internships, student research placements and adjacent experience, save roles in the current browser, and highlight skills from a resume processed on the device.

## Visual identity

Path49 uses an original lowercase `p49` and direction-arrow mark, bold sans-serif typography, white space and restrained subject accents: green for psychology, blue for sociology. The visual direction takes inspiration from the minimal project presentation at [Niner Software](https://ninersoftware.com/#projects); the mark and site are independent. No university seals, athletics marks or Niner Software logos are used.

## Location coverage

Metro searches include listed nearby places by default, with a strict city-only option. [The coverage guide](LOCATION-COVERAGE.md) explains the curated groups and the searchable, paginated browser of every source location. All active internships reconcile to exactly one source-location group, including international, remote, and unspecified locations. Featured city cards are overlapping subsets, not the whole catalogue.

## Student workspace

See [the completed three-phase roadmap](ROADMAP.md) for source verification, undergraduate screening, the redesigned cards, career preferences, expanded search, the application tracker/CSV export, in-site updates, and explainable recommendations. Preferences and tracker data stay on the current browser; resumes are still temporary and local. Updates appear when the website is open, with no email or background push service.

## Resume requirements review

On either page, add a PDF containing selectable text, DOCX, or text resume (up to 10 MB). The file is parsed in the browser. Each listing gets an expandable review with **Evidence found**, **Potential gaps**, and **Needs confirmation**, including posting excerpts and relevant resume/profile evidence. Major and GPA detected in the resume are prefilled for review; comparisons use the profile only after the user applies it. Optional profile details include enrollment, graduation month, school, availability and current certifications. Clear removes resume text, detected skills and profile from page memory; reloading also discards them. No resume/profile is uploaded or written to browser storage.

The checker compares simple explicit GPA thresholds, major mentions, enrollment conditions, graduation-month windows, and named CPR/BLS/RBT certifications. It keeps alternatives, ambiguous qualifications, school access, schedules, experience duration, and unsupported credentials for confirmation. Preferred conditions are labeled separately; a missing skill keyword is unknown, not a qualification failure. Community descriptions may omit requirements, and all results need comparison with the full employer posting. It does not decide eligibility or predict hiring. The listed-skills percentage is matching skill tags divided by the posting's listed skill tags.

## Sociology directory

The [blue sociology page](https://rmunozcuevas.github.io/psychology-sociology-internship-finder/sociology.html) has its own feed, career filters, resume skill vocabulary and browser-saved shortlist. Switch fields using the Psychology / Sociology links on either page. Internships appear first, followed by screened undergraduate experience roles. Research/evaluation, policy/advocacy, community services and HR/organizations are separate from broader management internships.

The November 6 snapshot contains 364 focused internship/student-placement candidates, 619 broader management candidates and 13 entry-level roles. Of the internship candidates, 430 came from employer observations and 553 from the community index. Counts are generated, not hardcoded. Titles alone do not guarantee major eligibility or Summer 2027 availability.

The existing noon `America/New_York` refresh now screens each raw posting for both disciplines and commits both feeds before deployment. `node scripts/refresh-sociology.mjs` can seed/rebuild sociology from retained employer observations plus a fresh community index; the regular daily collector has broader employer coverage. No extra login or API key is needed.

## What the counts mean

The November 6, 2026 snapshot contains **993 internship/student-placement candidates**:

- **373 focused opportunities:** clinical/community support, research, HR/I/O and related experience.
- **620 broader management internships:** displayed in their own section, with separate pagination.
- **395 explicitly mention Summer 2027** across both sections. Use the season filter for Summer, Spring or unspecified dates.

Of these, **447 came from employer feeds** and **546 came from a community index and require employer review**. Page checks now remove confirmed closures and label matching structured postings, but a community summary can still omit qualifications or school restrictions. Its provenance is visible on the card; it is not represented as employer-verified availability. Counts are generated from collected records and change as sources change. The separate entry-level count does not inflate the internship count.

The scan recorded **2,557 working employer sources** and **112 unavailable sources**. `source-health.json` contains individual results. The discovery pool contains 2,634 candidate board addresses; a configured address does not count as a successful source read.

## Browse and run locally

The psychology site uses [one canonical entry point](https://rmunozcuevas.github.io/psychology-sociology-internship-finder/index.html). The root URL redirects to it, preserving query strings and section links, so `/` and `/index.html` cannot diverge into separate interfaces. No account is needed to browse or save roles. Search titles, organizations, skills and locations; filter career path, season and opportunity type. Focused and broader sections use the same search/location/season criteria and have their own page controls.

There is no build step. Serve the repository over HTTP because the frontend uses JavaScript modules:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Resume matching accepts TXT, PDF and DOCX. PDF/DOCX parsers load from CDNs; TXT requires neither parser. The file stays in the browser. Skill overlap is a keyword heuristic, not a guarantee of eligibility.

## Daily refresh

“Refresh internship listings” starts every day at **12:00 p.m. Eastern time**, using `America/New_York` so it stays at noon during both EST and EDT. Collection runs first, then the website publishes the updated snapshot. GitHub can delay scheduled starts, so this is a noon refresh start rather than a guarantee that the new snapshot is visible at exactly noon. It can also be started manually from Actions.

1. Run the source parsing, deduplication and eligibility checks.
2. Discover up to 2,700 supported employer boards from the public [job-board-directory](https://kalebconfer-sys.github.io/job-board-directory/), prioritizing health, human services, research, education and larger employers with HR/people functions.
3. Read employer APIs, retrieve full qualifications where needed, screen roles and deduplicate requisitions.
4. Supplement with U.S. [SearchTern-Listings](https://github.com/KSaifStack/SearchTern-Listings) candidates observed within 14 days, keeping the community label. Employer results take priority for duplicate requisitions.
5. Check the five Charlotte-area program watchlist pages separately; uncertain or paused program leads do not enter the internship count.
6. Commit the collected snapshot, discovery registry and source-health report. Successful completion triggers Pages publishing and the optional database import.

The workflow reports actual counts in its run summary. Overlapping refreshes queue. Discovery outages reuse the last candidate registry. Records belonging to temporarily failed sources may be retained for up to 30 days, preserving their original check date. The frontend flags a feed older than 36 hours as overdue.

## Sources and screening

- `employer-boards.json`: manually reviewed priority employer identifiers.
- `discovered-boards.json`: generated discovery candidates, parsed only for supported ATS hosts.
- `scripts/refresh-jobs.mjs`: Greenhouse, Lever, Ashby, Workday, SmartRecruiters and configured BambooHR collection.
- `scripts/relevance.mjs` and `opportunity-rules.json`: relevant functions, student/experience distinction, senior/graduate-only exclusions and school-access signals.
- `scripts/posting-key.mjs`: requisition keys for tracking/locale variants and supported ATS identifiers.
- `source-health.json`: successful, unavailable and partial reads, including scan counts.

The count does not require “psychology” in a title. Undergraduate research/student placements, human services, clinical support, consumer research and workplace/HR functions can qualify. General management belongs in the broader section. Unrelated AI, quantitative-finance or physical-science research is excluded from the focused research group. Specialized construction, investment or product-management roles require explicit all-major/psychology context to enter the broader group. Professional-degree-only titles and known graduate-only requirements are excluded. Technician positions remain experience roles.

Workday searches combine quoted `"intern"` and `internship` terms to avoid matches to internal medicine. Pagination preserves a first-page total when later pages incorrectly report zero, detects repeated pages, and reports budget-limited reads as partial. Searches have a two-minute source budget and 1,000-result limit per query; detail collection has a three-minute total source budget. These limits are coverage limits, not claims that every vacancy was read.

For an optional same-day expansion, `--extend` reuses successful source reads from a collection completed within six hours; reuse is recorded. Scheduled runs always perform fresh collection. Provider-specific collection can write isolated snapshots with `--providers=... --output-dir=...`; `scripts/merge-snapshots.mjs` combines completed snapshots, applies current rules, and preserves employer priority over community records.

## UNC Charlotte and local programs

Explicit restrictions to another institution are screened out of live postings where detected. University program cards are shown only when `program-eligibility.json` documents external-student access. Duke-only and UGA-only programs are excluded; Princeton SYNAPSE remains because it has a non-Princeton undergraduate track. Unverified program cards stay hidden. Class year, citizenship, work authorization, major, academic credit and other individual requirements still require checking.

`local-program-sources.json` tracks Psychology For All, MHA Central Carolinas, Charlotte Community Health Clinic and UNC Charlotte programs. `local-programs.json` contains daily page checks and current uncertainty/paused labels. These are program leads, not guaranteed open positions or vacancy counts.

## Optional PostgreSQL API

The default public site reads the collected JSON snapshot. To use FastAPI/PostgreSQL:

1. Deploy `render.yaml` to provision the API and database.
2. Add the Actions secret `DATABASE_URL` and repository variable `API_BASE` with the deployed API origin.
3. Run “Refresh psychology internship database” manually, then deploy Pages so it receives the API address.

After each successful listing refresh, the database workflow checks out the new snapshot and runs `python backend/scrape.py --from-feed`. This imports the same records rather than performing a second inconsistent crawl. Known closing dates are stored and expired rows are excluded from API responses. Community provenance survives database import. When no database secret is configured, the optional import is skipped and the public JSON site continues working. The frontend loads all API pages rather than silently stopping at the first 2,000 rows.

## Checks and contributions

```sh
node --test tests/*.test.*
python3 -m py_compile backend/*.py
```

Checks cover requisition deduplication, vendor-host validation, Workday pagination/closures, eligibility, community freshness, focused versus broader relevance, and frontend counts/filtering/pagination. See [CONTRIBUTING.md](CONTRIBUTING.md) to suggest an official source or report a false positive. Do not manually insert listings or count ordinary jobs as internships to meet an inventory target.

### Source coverage and history

The public [source coverage page](https://rmunozcuevas.github.io/psychology-sociology-internship-finder/sources.html) distinguishes a successful source read from a source that actually yields screened undergraduate internship candidates. It includes metro counts for both disciplines, source search/status filters, pagination, scan timestamps, and separately marked failed-source carryovers. Totals deduplicate application URLs across both fields; discipline totals can overlap.

After collection and availability checks, `node scripts/source-coverage.mjs` updates `data/source-history.sqlite` and publishes `api/source-coverage.json`. The SQLite database is durable, checked into the repository, and contains only public job/source information. It stores sources, runs, source yield/errors, screened jobs, and per-run observations. The latest 35 snapshots are retained. The initial import establishes a baseline; subsequent snapshots show additions and removals from the feed (not necessarily employer closures). Rebuilding the same snapshot is idempotent. Resumes and application notes never enter this database.

The scheduled workflow runs at **12 PM America/New_York** daily; completion depends on collection time and GitHub's scheduler. SQLite and the JSON report are published with the static site. This does not require the optional PostgreSQL service or an API key. Python 3 and Node 22 are sufficient to build the coverage report.

Curated Workday boards can define `searches` for student/research placements and `fetchInternshipDetails` to screen titles that only reveal eligible majors in their full description. `replaces` suppresses obsolete discovered board IDs after an employer migration. Workday location extraction includes the requisition's location descriptor and additional locations. Public employer career APIs using Jibe/iCIMS Attract are collected by `scripts/jibe.mjs`, including bounded pagination and full-description eligibility screening. A zero-yield board remains visible as zero; adding a board does not imply adding an internship.
