export const ChatGptTabs = {
  HTML : "html",
  MARKDOWN : "markdown",
  CITATIONS : "citations",
}

export type ChatGptTabsType = typeof ChatGptTabs[keyof typeof ChatGptTabs];