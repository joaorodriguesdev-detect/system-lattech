export interface StoredUser {
  id: number;
  name: string;
  email: string;
  role: string;
  company_id: number;
}

const COOKIE_MAX_AGE = 60 * 60 * 24;

export function setSessionCookies(accessToken: string, tokenType: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `access_token=${encodeURIComponent(accessToken)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  document.cookie = `token_type=${encodeURIComponent(tokenType)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export function clearSessionCookies() {
  if (typeof document === 'undefined') return;
  document.cookie = 'access_token=; path=/; max-age=0; samesite=lax';
  document.cookie = 'token_type=; path=/; max-age=0; samesite=lax';
  document.cookie = 'tenant_status=; path=/; max-age=0; samesite=lax';
}

export function setTenantStatusCookie(status: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `tenant_status=${encodeURIComponent(status)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export function setTenantStatusStorage(status: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tenant_status', status);
}

export function setAuthSession(accessToken: string, tokenType: string, user: StoredUser, tenantStatus = 'active') {
  if (typeof window === 'undefined') return;
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('token_type', tokenType);
  localStorage.setItem('user', JSON.stringify(user));
  setSessionCookies(accessToken, tokenType);
  setTenantStatusCookie(tenantStatus);
  setTenantStatusStorage(tenantStatus);
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.clear();
  clearSessionCookies();
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.split('=').slice(1).join('='));
}

export function getTenantStatus(): string {
  if (typeof window === 'undefined') return 'active';
  return localStorage.getItem('tenant_status') || getCookieValue('tenant_status') || 'active';
}

export function getTenantSubdomain(hostname: string): string {
  let sub = 'mariobarber';

  if (hostname.includes('lvh.me')) {
    sub = hostname.replace('.lvh.me', '');
  } else if (hostname !== 'localhost' && hostname.includes('.')) {
    sub = hostname.split('.')[0];
  }

  return sub;
}

