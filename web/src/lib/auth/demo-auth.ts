/** Detect legacy offline demo tokens that must never be sent to the API. */
export function isOfflineDemoToken(token: string | null | undefined): boolean {
  return !!token?.startsWith("demo-offline-");
}
