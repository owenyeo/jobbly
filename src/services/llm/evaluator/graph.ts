import { StateGraph } from '@langchain/langgraph';
import { EvaluationStateAnnotation } from './state';
import { extractNode } from './nodes/extract';
import { vectorizeNode } from './nodes/vectorize';
import { rankNode } from './nodes/rank';

const workflow = new StateGraph(EvaluationStateAnnotation)
  .addNode('extract', extractNode)
  .addNode('vectorize', vectorizeNode)
  .addNode('rank', rankNode)
  .addEdge('__start__', 'extract')
  .addEdge('extract', 'vectorize')
  .addEdge('vectorize', 'rank')
  .addEdge('rank', '__end__');

export const graph = workflow.compile();
