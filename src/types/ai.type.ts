// 1. AI Types
export type AiType =
  | "chatgpt"
  | "perplexity"
  | "copilot"
  | "bic"
  | "claudePro"
  | "claudeO"
  | "gemini"
  | "M365";

// 2. AI Engine mapping (used by Agent)
export const AIEngine = {
  ChatGPT: "ChatGpt",
  Perplexity: "PplxPro",
  Copilot: "Copilot",
  BIC: "BIC",
  ClaudePro: "ClaudePro",
  ClaudeO: "ClaudeO",
  Gemini: "Gemini",
  M365: "M365"
} as const;

// 3. AI Engine Type
export type AIEngine = (typeof AIEngine)[keyof typeof AIEngine];

// 4. Alias type
export type AiAliasType =  "cp" |'pp'| 'cpp'| 'cg'|'bic' |'gp' | 'cldo' |'mcp';

// 5. Mapping AiType to AiAliasType
export const AiAlias: Record<AiType, AiAliasType> = {
  chatgpt: "cg",
  perplexity: "pp",
  copilot: "cpp",
  bic: "bic",
  claudePro: "cp",
  claudeO: "cldo",
  gemini: "gp",
  M365: "mcp"
};

// 6. Reverse mapping (optional)
export const AliasToAiType: Record<AiAliasType, AiType> = {
  cg: "chatgpt",
  pp: "perplexity",
  cpp: "copilot",
  bic: "bic",
  cp: "claudePro",
  cldo: "claudeO",
  gp: "gemini",
  mcp: "M365"
};

// 7. Agent string (runtime string) to AiType
export const AgentToAiType: Record<string, AiType> = {
  [AIEngine.ChatGPT]: "chatgpt",
  [AIEngine.Perplexity]: "perplexity",
  [AIEngine.Copilot]: "copilot",
  [AIEngine.BIC]: "bic",
  [AIEngine.ClaudePro]: "claudePro",
  [AIEngine.ClaudeO]: "claudeO",
  [AIEngine.Gemini]: "gemini",
  [AIEngine.M365]: "M365"
};
