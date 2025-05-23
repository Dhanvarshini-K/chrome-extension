export type AiType = "chatgpt" | "perplexity";


export const AIEngine = {
  ChatGPT: "ChatGptPro",
  Perplexity: "PplxPro",
} as const;

export type AIEngine = (typeof AIEngine)[keyof typeof AIEngine];

export const HEADERS = [
  "OID",
  "ChatID",
  "TurnID",
  "Engine",
  "Query",
  "ResponseText",
  "ResponseHTML",
  "Sources",
  "ResponseImage",
  "ResponseCode",
  "PerfData",
  "Agent",
  "TimeStamp",
];