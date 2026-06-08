# UI Specification

## 1. Global UI & Theme Guidelines
* **Design Pattern:** Component-Driven Architecture. Separate heavy presentation layout from small, atomic UI elements.
* **Responsive Breakpoints:** Optimized primarily for Desktop (Dashboard workflow), with fluid layout handling for mobile tracking viewports.
* **Component Framework:** Tailwind CSS with a clean, functional component library (e.g., Shadcn UI primitives).

---

## 2.Pages

### 2.1 Home Page (/)

Gives an overview of the new jobs found, together with the top 10 jobs based on similarity along with their links and some elements of the dashboard such as application count and conversion rate, maybe an AI overview and suggestions to my strategy

### 2.2 Job page (/jobs)

Shows all parsed jobs with a filter and sort by function. Includes those that the LLM did not parse (raw data). Can sort by status as well (ongoing) and update statuses accordingly when things change

- When clicked, a modal slides out instead of navigating to another page for quick access and updates

### 2.3 Dashboard (/dashboard)

Shows dashboard showing the conversion rate, application counts and match scores. Also has a kanban board showing selected jobs in each status for a better visual flow 

### 2.4 Logs (/logs)

For viewing system logs based on the `agent_logs` table.

---

## 3. Detailed Page Breakdown: Kanban Board (`/dashboard`)

### A. View Component Hierarchy
*Outline how files should be nested in the file system.*
```text
src/app/dashboard/page.tsx                  # Main Controller Page (Fetches Data)
├── src/components/dashboard/
│   ├── KanbanBoard.tsx                     # Grid wrapper managing the columns
│   ├── KanbanColumn.tsx                    # Individual status lists (e.g., 'Applied')
│   └── ApplicationModal.tsx                # Slide-out drawer for deep-dive editing
├── src/components/jobs/
│   ├── JobDetailsModal.tsx                 # Detailed view for a single job
│   └── JobFilters.tsx                      # Filters for job search and sorting
└── src/components/shared/
    └── JobCard.tsx                         # Unified, reusable draggable job card component
    └── JobListItem.tsx                     # Unified, reusable job list item component
```

### B. Interactive View States
The UI component must explicitly handle these lifecycle states:

- LOADING: Displays skeleton cards mirroring the grid layout during initial data fetching from Supabase.
- EMPTY: Displayed when a column contains zero jobs. Include a quick-action button: "Trigger Scraper Engine".
- ERROR: Graceful toast notification banner if the client network connection drops, preserving local UI state without crashing.

---

## 4. Detailed Page Breakdown: System Logs (`/dashboard/logs`)

### A. View Component Hierarchy
```text
src/app/dashboard/logs/page.tsx
└── src/components/logs/
    ├── LogTable.tsx                        # Tabular viewer for agent_execution_logs
    └── LogFilterBar.tsx                    # Interactive filter by agent type or status
```

### B. Core UI Interaction Properties
Live Revalidation: Implements a manual "Refresh Logs" button or establishes a Supabase realtime subscription to watch scraping logs update live.

Status Badge Mapping: * 'running' ➔ Animated spin pattern

'success' ➔ Safe/positive visual indicator

'failed'  ➔ Error/alert visual indicator

---

## 5. Global Action Modals & Drawers
### A. Job Card Deep-Dive Modal
Triggers when clicking an individual JobCard. Must load and expose:

Left Column: Job Description tab switcher (Cleaned Structured Text vs. Raw Scraped HTML Source).

Right Sticky Panel: Edit panel for application_status enum updating, interview date scheduler input field, and personalized notes text area.

### B. Scraper Trigger Panel
Floating action control available across the dashboard environment:

Ingests a text input field for manual target URLs.

Contains a single primary action button to invoke the /api/scrape server routing sequence.