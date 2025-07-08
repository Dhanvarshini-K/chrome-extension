export function extractIdFromPath(text: string) {
  const match = text.match(/\/c\/([0-9a-fA-F-]{36})/);
  return match ? match[1] : null;
}

export function extractIdFromPathForCopilot(text: string) {
  const match = text.match(/\/chats\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function extractIdFromPathForBIC(url: string) {
  const match = url.match(/\/([0-9a-fA-F\-]+)\?/);
  console.log("match", match);
  return match ? match[1] : null;
}

export function extractIdFromPathForClaude(url: string) {
  const match = url.match(/\/chat\/([a-f0-9\-]+)/);
  if (match) {
    const chatId = match[1];
    console.log("Chat ID:", chatId);
    return chatId;
  } else {
    console.log("No chat ID found.");
  }
}
