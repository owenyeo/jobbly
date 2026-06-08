# Technical Specification: Agentic Job Application Tracker

## 1. System Overview & Context

- **Role for AI:** You are a Staff Engineer implementing a production-ready, type-safe system based on this exact specification. Do not deviate from these architectural boundaries.
- **Objective:** An automated, agentic job tracking application that scrapes job listings, formats messy DOM data into structured entities, evaluates profile fit, and tracks application lifecycles.
- **Tech Stack:** Next.js (App Router), TypeScript, Supabase (PostgreSQL + pgvector), Redis/BullMQ (Task Queue), DeepSeek API.

---

## 2. Global Architecture Boundaries

- **Directory Isolation:** Maintain strict low coupling. UI lives in `src/app/`, backend clients live in `src/lib/`, and agent logic lives exclusively in `src/services/`.
- **State Management:** Front-end components must remain lightweight. Heavy background workloads (scraping, LLM processing) must be deferred to backend task queues to avoid blocking network execution loops or triggering timeouts.
- **Type Safety:** Every table, API response, and queue payload must map to an explicit TypeScript interface. No `any` types allowed.

---

## 3. Database Schema Definitions

*Implement these tables exactly using Supabase/PostgreSQL primitives. Ensure foreign key indexes are explicitly created.*

### Enums

- `application_status`: `'saved'`, `'applied'`, `'rejected'`, `'ghosted'`, `'scheduling'`, `'technical_interview'`, `'behavioural_interview'`, `'HR_round'`
- `agent_status`: `'running'`, `'failed'`, `'idle'`, `'success'`
- `work_mode_type`: `'remote'`, `'hybrid'`, `'on_site'`

### Tables

### A. `job_applications`

- `uuid`: UUID Primary Key DEFAULT gen_random_uuid()
- `company_name`: VARCHAR(256) NOT NULL
- `job_title`: VARCHAR(256) NOT NULL
- `location`: VARCHAR(256)
- `work_mode`: work_mode_type NOT NULL
- `application_link`: TEXT NOT NULL UNIQUE
- `created_at`: TIMESTAMPTZ DEFAULT now()
- `status`: application_status NOT NULL DEFAULT 'saved'
- `salary_min`: INTEGER NULL
- `salary_max`: INTEGER NULL
- `raw_html`: TEXT NULL
- `structured_description`: TEXT NULL

### B. `job_embeddings`

- `uuid`: UUID Primary Key DEFAULT gen_random_uuid()
- `job_id`: UUID Foreign Key REFERENCES job_applications(uuid) ON DELETE CASCADE
- `embedding`: vector(1536) # Adjust based on chosen embedding model dimension
- `match_score`: FLOAT

### C. `agent_execution_logs`

- `uuid`: UUID Primary Key DEFAULT gen_random_uuid()
- `agent_name`: VARCHAR(256) NOT NULL
- `status`: agent_status NOT NULL DEFAULT 'idle'
- `error_message`: TEXT NULL
- `execution_time_ms`: INTEGER NULL
- `created_at`: TIMESTAMPTZ DEFAULT now()

---

## 4. System Data Contracts (Payloads)

*The system components must exchange data using only these strict JSON definitions.*

### Scraper to Queue Contract

```json
{
  "source_platform": "string (linkedin | nodeflair | glassdoor)",
  "application_link": "string (valid URL)",
  "company_name": "string",
  "job_title": "string",
  "raw_html": "string"
}
```

### Queue to Evaluator Contract

```json
{
	"job_application_uuid": "string (valid UUID)"
	"raw_html": "string"
}
```

## 5. Agentic Workflows and State Machines

### Workflow A: Web Scraping (Cron triggered)

1. Access pre-filtered URLs for job recommendations
2. Extract HTML content payload
3. Assert if contract is correct. if malformed, log to agent_logs with the status ‘failed’
4. If contract is correct, insert to the job_application table with the status ‘saved’
5. Add job_application_uuid into evaluation queue

### Workflow A.5: The Pre-Evaluation Funnel (Cost Control Filter)

- **Objective:** Prevent expensive LLM embedding calls on obviously irrelevant jobs using a zero-cost local heuristic.
- **Execution:** Runs in the Node.js queue consumer *before* hitting the DeepSeek API.
- **Step 1: The Negative Filter (Exclusion - Fail Fast)**
    - Normalise `job_title` to lowercase.
    - Drop the job immediately if the title contains seniority markers beyond a fresh graduate scope: `['senior', 'staff', 'principal', 'director', 'vp', 'lead', 'head of']`.
    - Drop if the title implies a completely disconnected department: `['sales', 'marketing', 'hr', 'accountant', 'nurse']`.
- **Step 2: The Broad Tech Taxonomy (Inclusion - Pass to LLM)**
    - Scan the `job_title` and the first 1000 characters of `raw_html`.
    - Pass the job to the Evaluation Agent IF it contains at least one match from the core competency array:
    `['software', 'developer', 'forward deployed', 'data engineer', 'project manager', 'react', 'node', 'express', 'pyspark', 'kafka', 'langgraph', 'langchain']`.
- **Fallback Logic:** If a job passes the Negative Filter but misses the Tech Taxonomy, do not delete it. Flag its status as `'saved'` in the database but do NOT trigger the LLM agent. This allows the user to manually review edge-case jobs in the UI without spending API credits.

### Workflow B: Evaluation Workflow (Stateful LangGraph)

*Directory Isolation: All logic must live within `src/services/llm/evaluator/`.*

**1. State Definition (`state.ts`)**
- Define the `StateGraph` interface explicitly (e.g., tracking `job_application_uuid`, `raw_html`, `structured_data`, `match_score`, and `errors` across the nodes).

**2. The Orchestrator (`graph.ts`)**
- Wires the nodes together and defines conditional routing (e.g., routing to an error state if extraction fails).

**3. Node 1: Extraction and Cleaning (`nodes/extract.ts`)**
- Ingests the evaluation queue payload.
- Strips HTML noise using lightweight parse routines. 
- Formats unstructured text into clear sections: Role, Tech Stack, Requirements.

**4. Node 2: Parsing and Similarity (`nodes/vectorize.ts`)**
- Concatenates `job_title`, `company_name`, and cleaned text. 
- Requests vector coordinates from the vector embedding API. 
- Saves the output to the `job_embeddings` table.

**5. Node 3: Rank (`nodes/rank.ts`)**
- Executes cosine similarity comparison against the candidate profile template vector. 
- Calculates the final `match_score` and updates the `job_applications` table.

## 6. Error Matrix and Guidelines

| **Failure Scenario** | **Required System Action** | **Guardrail Rule** |
| --- | --- | --- |
| Scraping target blocks the bot | Catch error, save HTTP status code to `agent_execution_logs`, terminate thread gracefully. | Do NOT throw an unhandled exception or crash the process. |
| LLM API times out or rate limits | Catch error, trigger exponential backoff retry via task queue (max 3 retries). | Maintain atomic state; do not write partial rows. |
| LLM returns corrupted or invalid JSON | Pass raw string back to a validation routine; if recovery fails, log failure reason and flag job for human review. | Fallback cleanly without stopping the queue loop. |


