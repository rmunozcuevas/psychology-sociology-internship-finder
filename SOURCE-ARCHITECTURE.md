# Path49 source pipeline

```mermaid
flowchart TD
  A[Daily schedule · noon Eastern] --> B[Employer source registry + board discovery]
  B --> C[Public employer APIs]
  B --> D[SearchTern community index]
  C --> E[Full descriptions + undergraduate eligibility screening]
  D --> E
  E --> F[Deduplicate requisitions + check deadlines and closures]
  F --> G[Psychology and sociology feeds]
  F --> H[SQLite source-history database]
  H --> I[Public coverage JSON report]
  G --> J[GitHub Pages · open internship search]
  I --> K[Source coverage dashboard]
  J --> L[Resume review + application tracker stored in the browser]
```

The registry contains employer board identifiers, not hand-entered job listings. Each scan records source health, screened internship yield, and failures. Workday priority sources support targeted student/research searches and full internship descriptions. Jibe/iCIMS Attract career APIs are supported alongside Greenhouse, Lever, Ashby, SmartRecruiters, BambooHR and Workday.

The database preserves source-run statistics and screened job observations across refreshes. Reports distinguish working sources from productive sources and recent carryovers from failed sources. Combined totals deduplicate applications shared between psychology and sociology. Metro counts use the same matching rules as the search pages.

SQLite and report snapshots are updated in the scheduled GitHub Actions workflow, committed, and published to GitHub Pages. The site uses public JSON reads; it does not depend on a running database server. The existing optional PostgreSQL backend remains separate and requires its own configured database service. Personal resumes and application notes never enter the public source database.

Source coverage reports the collected catalogue, not the total number of internships in a city. No system can guarantee admission or qualification from a title match. The listing and resume review help students check employer requirements.
