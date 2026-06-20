# Jobbly 💼🤖
### Autonomous, Event-Driven Job Application Tracker

Jobbly is an intelligent, self-orchestrating job tracking system designed to scrape, structure, rank, and track job applications. By combining **Next.js (App Router)**, **TypeScript**, **Supabase (PostgreSQL + pgvector)**, **Valkey/Redis (BullMQ task queues)**, and agentic workflows built on **LangGraph + DeepSeek/OpenAI**, Jobbly eliminates manual spreadsheet upkeep and prioritizes the best roles for you.

---

## 🌟 Key Features

- **Automated Web Ingestion**: Periodically polls pre-filtered job URLs, extracts raw HTML, and saves relevant jobs.
- **Cost-Control Pre-Evaluation**: Uses local heuristical negative filters (filtering out irrelevant levels like Senior/Staff or unrelated domains) and inclusion filters before running expensive LLM calls.
- **Agentic Evaluation (LangGraph)**:
  - **Extraction**: Clean and strip HTML noise to produce structured markdown (Role, Stack, Requirements).
  - **Vectorization**: Generate embeddings via OpenAI.
  - **Ranking**: Calculates cosine similarity against your candidate resume profile and updates your application entry.
- **Draggable Kanban Dashboard**: Track candidate pipeline stages (`saved` ➔ `applied` ➔ `technical_interview` ➔ `HR_round` etc.) dynamically.
- **Real-Time Agent Observation**: Exposes background execution logs to keep track of scraper & evaluator statuses.

---

## 🛠️ Tech Stack

- **Frontend/Framework**: Next.js 16 (App Router), Tailwind CSS, React 19, Shadcn UI
- **Database**: Supabase (PostgreSQL) + `pgvector`
- **Distributed Queues**: BullMQ + Valkey/Redis
- **AI Orchestration**: LangGraph, LangChain, DeepSeek API, OpenAI Embeddings
- **Testing Suite**: Vitest, React Testing Library

---

## 📦 Getting Started

### 1. Prerequisites
Make sure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+)
- [Redis](https://redis.io/) or Valkey (for BullMQ queues)
- A [Supabase](https://supabase.com/) account/project with database privileges

### 2. Environment Setup
Copy the example environment file and fill in your credentials:
```bash
cp .env.example .env
```
Edit `.env` and configure:
- `NEXT_PUBLIC_SUPABASE_URL` and keys
- `REDIS_URL` (e.g. `redis://localhost:6379`)
- `DEEPSEEK_API_KEY` & `OPENAI_API_KEY`
- `SCRAPER_API_KEY` (if using premium scraping services)

### 3. Database Initialization (Migrations)
Run the following SQL commands in your Supabase SQL Editor to provision the required database schema, enums, extensions, and tables:

```sql
-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Custom Enums
CREATE TYPE application_status AS ENUM (
  'saved',
  'applied',
  'rejected',
  'ghosted',
  'scheduling',
  'technical_interview',
  'behavioural_interview',
  'HR_round'
);

CREATE TYPE agent_status AS ENUM (
  'running',
  'failed',
  'idle',
  'success'
);

CREATE TYPE work_mode_type AS ENUM (
  'remote',
  'hybrid',
  'on_site'
);

-- 3. Create Tables
-- A. job_applications Table
CREATE TABLE job_applications (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(256) NOT NULL,
  job_title VARCHAR(256) NOT NULL,
  location VARCHAR(256),
  work_mode work_mode_type NOT NULL,
  application_link TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  status application_status NOT NULL DEFAULT 'saved',
  salary_min INTEGER,
  salary_max INTEGER,
  raw_html TEXT,
  structured_description TEXT,
  agent_decision VARCHAR(50), -- 'pass' | 'fallback' | 'drop'
  notes TEXT,
  interview_date TIMESTAMPTZ
);

-- B. job_embeddings Table
CREATE TABLE job_embeddings (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES job_applications(uuid) ON DELETE CASCADE NOT NULL,
  embedding vector(1536),
  match_score FLOAT
);

-- C. agent_execution_logs Table
CREATE TABLE agent_execution_logs (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(256) NOT NULL,
  status agent_status NOT NULL DEFAULT 'idle',
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- D. candidate_profile Table
CREATE TABLE candidate_profile (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_text TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create Utility Indexes
CREATE INDEX idx_job_embeddings_job_id ON job_embeddings(job_id);
```

---

## 🏃 Running the Application

To run the application locally, you must run both the **Next.js Dev Server** and the **BullMQ Background Worker** in parallel.

### Run Next.js Dev Server
```bash
npm run dev
```
Accessible at [http://localhost:3000](http://localhost:3000).

### Run Background Task Worker
Ensure your Redis/Valkey instance is running, then start the BullMQ consumer:
```bash
npm run worker
```
The worker listens to the evaluation queue, processes HTML parsing, invokes OpenAI for embeddings, runs the LangGraph evaluator, and updates job application ranks.

### Ingestion Flow (API Routes)
- **Manual Trigger**: Send a POST request to `/api/scrape` containing `url` to scrape and enqueue a job.
- **Cron Jobs / Polling**: The system polls configured sites periodically, dumping scraped listings into the database and routing them into the queue.

---

## 🧪 Testing

The codebase includes an extensive suite of unit and integration tests written in **Vitest**.

Run tests in watch mode:
```bash
npm run test
```

Run tests and check for lint errors:
```bash
npm run lint
```
