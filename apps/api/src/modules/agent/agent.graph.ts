import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type { FlowType } from "@cpj-cobranca/shared/flow-types";

export type AgentGraphState = {
  flowType: FlowType;
  input: Record<string, unknown>;
  rendered?: unknown;
  setting?: unknown;
  llmResult?: unknown;
  output?: unknown;
  persistedExecution?: unknown;
};

export type AgentGraphCallbacks = {
  loadPromptAndSettings: (state: AgentGraphState) => Promise<Partial<AgentGraphState>>;
  callModel: (state: AgentGraphState) => Promise<Partial<AgentGraphState>>;
  validateAndRepair: (state: AgentGraphState) => Promise<Partial<AgentGraphState>>;
  persistExecution: (state: AgentGraphState) => Promise<Partial<AgentGraphState>>;
};

const AgentGraphAnnotation = Annotation.Root({
  flowType: Annotation<FlowType>(),
  input: Annotation<Record<string, unknown>>(),
  rendered: Annotation<unknown>(),
  setting: Annotation<unknown>(),
  llmResult: Annotation<unknown>(),
  output: Annotation<unknown>(),
  persistedExecution: Annotation<unknown>(),
});

export async function runAgentGraph(
  initialState: AgentGraphState,
  callbacks: AgentGraphCallbacks,
): Promise<AgentGraphState> {
  const graph = new StateGraph(AgentGraphAnnotation)
    .addNode("load_prompt_and_settings", callbacks.loadPromptAndSettings)
    .addNode("call_model", callbacks.callModel)
    .addNode("validate_and_repair", callbacks.validateAndRepair)
    .addNode("persist_execution", callbacks.persistExecution)
    .addEdge(START, "load_prompt_and_settings")
    .addEdge("load_prompt_and_settings", "call_model")
    .addEdge("call_model", "validate_and_repair")
    .addEdge("validate_and_repair", "persist_execution")
    .addEdge("persist_execution", END)
    .compile();

  return graph.invoke(initialState);
}
