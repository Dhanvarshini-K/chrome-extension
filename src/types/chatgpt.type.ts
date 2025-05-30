export const ResponseTabs = {
  HTML: "html",
  MARKDOWN: "markdown",
  CITATIONS: "citations",
} as const;

export type ResponseTabsType = typeof ResponseTabs[keyof typeof ResponseTabs];
