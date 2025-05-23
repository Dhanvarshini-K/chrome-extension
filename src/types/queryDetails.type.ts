export interface QueryItem {
  TaskID: string;
  OID: string;
  Query: string;
  ChatId?: string;
  Sources?: string;
  ResponseText?: string;
  ResponseHTML?: string;
  ResponseImage?: string;
  Agent?: string;
  PerfData?: string;
  Timestamp?: string;
  ResponseCode?: string;
  [key: string]: any;
}

export const HEADERS = [
  "OID",
  "ChatID",
  "TurnID",
  "Engine",
  "Query",
  "ResponseHTML",
  "ResponseText",
  "Sources",
  "ResponseImage",
  "ResponseCode",
  "PerfData",
  "Agent",
  "TimeStamp",
];