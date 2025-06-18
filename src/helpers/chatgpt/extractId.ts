export function extractIdFromPath(text: string) {
  const match = text.match(/\/c\/([0-9a-fA-F-]{36})/);
  return match ? match[1] : null;
}

export function extractIdFromPathForCopilot(text: string) {
  const match = text.match(/\/chats\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}
