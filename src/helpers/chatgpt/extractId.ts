export function extractIdFromPath(text: string) {
  const match = text.match(/\/c\/([0-9a-fA-F-]{36})/);
  return match ? match[1] : null;
}
