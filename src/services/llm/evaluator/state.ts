import { Annotation } from '@langchain/langgraph';

export const EvaluationStateAnnotation = Annotation.Root({
  job_application_uuid: Annotation<string>(),
  job_title: Annotation<string>(),
  company_name: Annotation<string>(),
  raw_html: Annotation<string | null>(),
  structured_description: Annotation<string | null>(),
  match_score: Annotation<number | null>(),
  agent_decision: Annotation<'pass' | 'fallback' | 'drop' | null>(),
  errors: Annotation<string[]>({
    reducer: (a, b) => a.concat(b),
    default: () => [],
  }),
});

export type EvaluationState = typeof EvaluationStateAnnotation.State;
