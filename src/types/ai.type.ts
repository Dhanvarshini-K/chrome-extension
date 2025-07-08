// 1. AI Types
export type AiType =
  | "chatgpt"
  | "perplexity"
  | "copilot"
  | "bic"
  | "claudeS"
  | "claudeO";

// 2. AI Engine mapping (used by Agent)
export const AIEngine = {
  ChatGPT: "ChatGptPro",
  Perplexity: "PplxPro",
  Copilot: "Cplt",
  BIC: "BIC",
  ClaudeS: "ClaudeS",
  ClaudeO: "ClaudeO",
} as const;

// 3. AI Engine Type
export type AIEngine = (typeof AIEngine)[keyof typeof AIEngine];

// 4. Alias type
export type AiAliasType = "cgp" | "pp" | "cp" | "bic" | "clds" | "cldo";

// 5. Mapping AiType to AiAliasType
export const AiAlias: Record<AiType, AiAliasType> = {
  chatgpt: "cgp",
  perplexity: "pp",
  copilot: "cp",
  bic: "bic",
  claudeS: "clds",
  claudeO: "cldo",
};

// 6. Reverse mapping (optional)
export const AliasToAiType: Record<AiAliasType, AiType> = {
  cgp: "chatgpt",
  pp: "perplexity",
  cp: "copilot",
  bic: "bic",
  clds: "claudeS",
  cldo: "claudeO",
};

// 7. Agent string (runtime string) to AiType
export const AgentToAiType: Record<string, AiType> = {
  [AIEngine.ChatGPT]: "chatgpt",
  [AIEngine.Perplexity]: "perplexity",
  [AIEngine.Copilot]: "copilot",
  [AIEngine.BIC]: "bic",
  [AIEngine.ClaudeS]: "claudeS",
  [AIEngine.ClaudeO]: "claudeO",
};
