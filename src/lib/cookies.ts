import Cookies from 'js-cookie';

const TOKEN_KEY = 'ncct_access_token';
const REFRESH_TOKEN_KEY = 'ncct_refresh_token';
const USER_KEY = 'ncct_user';

export const cookieStorage = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return Cookies.get(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  },

  setAccessToken(token: string) {
    // 30 mins expiry roughly matching JWT
    Cookies.set(TOKEN_KEY, token, {
      expires: 1 / 48, // ~30 minutes
      sameSite: 'lax',
      secure: window.location.protocol === 'https:',
      path: '/'
    });
    localStorage.setItem(TOKEN_KEY, token);
  },

  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return Cookies.get(REFRESH_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token: string) {
    Cookies.set(REFRESH_TOKEN_KEY, token, {
      expires: 7, // 7 days
      sameSite: 'lax',
      secure: window.location.protocol === 'https:',
      path: '/'
    });
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },

  getUser(): any | null {
    if (typeof window === 'undefined') return null;
    const raw = Cookies.get(USER_KEY) || localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setUser(user: any) {
    const raw = JSON.stringify(user);
    Cookies.set(USER_KEY, raw, {
      expires: 7,
      sameSite: 'lax',
      secure: window.location.protocol === 'https:',
      path: '/'
    });
    localStorage.setItem(USER_KEY, raw);
  },

  clearAuth() {
    Cookies.remove(TOKEN_KEY, { path: '/' });
    Cookies.remove(REFRESH_TOKEN_KEY, { path: '/' });
    Cookies.remove(USER_KEY, { path: '/' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }
};
