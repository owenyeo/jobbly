// TypeScript Types for Agentic Job Application Tracker (Jobbly)

export type WorkMode = 'remote' | 'hybrid' | 'on_site';

export type ApplicationStatus =
  | 'saved'
  | 'applied'
  | 'rejected'
  | 'ghosted'
  | 'scheduling'
  | 'technical_interview'
  | 'behavioural_interview'
  | 'HR_round';

export type AgentStatus = 'running' | 'failed' | 'idle' | 'success';

// JSON interface mapping forserialized errors inside execution logs
export interface AgentErrorMessage {
  message: string;
  stack?: string | null;
}

export interface JobApplication {
  uuid: string;
  company_name: string;
  job_title: string;
  location: string | null;
  work_mode: WorkMode;
  application_link: string;
  created_at: string;
  status: ApplicationStatus;
  salary_min: number | null;
  salary_max: number | null;
  raw_html?: string | null;
  structured_description?: string | null;
  match_score?: number; // Calculated match score matching database or dynamic joins
  agent_decision?: 'pass' | 'fallback' | 'drop' | null;
}

export interface JobEmbedding {
  uuid: string;
  job_id: string;
  embedding: number[]; // Float coordinate vector (e.g. dimension 1536)
  match_score: number | null;
}

export interface AgentExecutionLog {
  uuid: string;
  agent_name: string;
  status: AgentStatus;
  error_message: string | null; // Raw JSON string or simple text, parsed to AgentErrorMessage
  execution_time_ms: number | null;
  created_at: string;
}
