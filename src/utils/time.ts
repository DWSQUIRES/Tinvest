export function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

export function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60_000);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
