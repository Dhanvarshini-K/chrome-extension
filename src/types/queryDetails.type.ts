export interface QueryItem {
  TaskID: string;
  OID: string;
  Query: string;
  ChatId: string;
  Sources:string;
  ResponseText: string;
  ResponseHTML: string;
  ResponseImage: string;
  Agent: string;
  PerfData: string;
  Timestamp: string;
  ResponseCode: string;
  Engine:string;
  [key: string]: any;
}

export type QueryFormData = {
  OID: string;
  Query: string;
  Engine:string;
};

export const HEADERS = [
  "TaskID",
  "OID",
  "ChatID",
  "QueryID",
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