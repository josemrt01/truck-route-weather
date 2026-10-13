// Possible states of the backend connection; used by App and getBackendStatus.
// OK matches the status the backend health endpoint returns.
export const BackendStatus = {
  CHECKING: 'checking',
  OK: 'ok',
  UNREACHABLE: 'unreachable',
} as const

export type BackendStatus = (typeof BackendStatus)[keyof typeof BackendStatus]
