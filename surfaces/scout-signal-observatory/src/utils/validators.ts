export function isValidSignalInput(input: string): boolean {
  return typeof input === 'string' && input.trim().length > 0;
}

export function isValidConfidence(value: number): boolean {
  return typeof value === 'number' && value >= 0 && value <= 1;
}
