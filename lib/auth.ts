// src/lib/auth.ts

export interface AuthUser {
  id: number;
  nama: string;
  role: 'ADMIN' | 'PENAGIH';
}

export const simpanSesi = (token: string, user: AuthUser) => {
  if (typeof window === 'undefined') return;

  // 1. Simpan di localStorage untuk kemudahan akses client-side (dukung quinnet & backward-compatibility)
  localStorage.setItem('quinnet_token', token);
  localStorage.setItem('quinnet_user', JSON.stringify(user));
  localStorage.setItem('quennet_token', token);
  localStorage.setItem('quennet_user', JSON.stringify(user));

  // 2. Simpan di cookie agar bisa diakses oleh Next.js Server Components / Middleware
  // Berlaku selama 7 hari
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `quinnet_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `quinnet_role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `quennet_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `quennet_role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
};

export const hapusSesi = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('quinnet_token');
  localStorage.removeItem('quinnet_user');
  localStorage.removeItem('quennet_token');
  localStorage.removeItem('quennet_user');
  document.cookie = 'quinnet_token=; path=/; max-age=0';
  document.cookie = 'quinnet_role=; path=/; max-age=0';
  document.cookie = 'quennet_token=; path=/; max-age=0';
  document.cookie = 'quennet_role=; path=/; max-age=0';
};

export const ambilToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('quinnet_token') || localStorage.getItem('quennet_token');
};

export const ambilUser = (): AuthUser | null => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('quinnet_user') || localStorage.getItem('quennet_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};