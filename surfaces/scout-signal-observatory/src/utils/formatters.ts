export function formatConfidencePercent(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

export function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}
