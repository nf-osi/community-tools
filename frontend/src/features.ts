// Build-time feature flags (Vite env). Default OFF unless explicitly "true".
//
// VITE_ENABLE_AGENTS — exposes the Agent Gallery (landing card + /agents routes).
// Off in production until the agents are tested; on in dev (frontend/.env.development).
export const AGENTS_ENABLED = import.meta.env.VITE_ENABLE_AGENTS === 'true';
