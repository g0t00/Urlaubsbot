export const API_BASE = '/group';

export function authHeaders(): Record<string, string> {
  const user = localStorage.getItem('user');
  return user === null ? {} : { Auth: user };
}
