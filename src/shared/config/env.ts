export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '',
  appName: import.meta.env.VITE_APP_NAME ?? 'Project Manager',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
}
