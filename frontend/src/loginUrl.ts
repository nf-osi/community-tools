// Build the Synapse login URL, carrying the current SPA path as `return` so the
// OAuth callback can send the user back to where they started.
export function loginUrl(): string {
  const base = `${import.meta.env.VITE_AUTH_BASE ?? ''}/api/auth/login`;
  const returnTo = window.location.pathname + window.location.search;
  return `${base}?return=${encodeURIComponent(returnTo)}`;
}
