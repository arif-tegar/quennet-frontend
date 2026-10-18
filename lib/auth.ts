// src/lib/auth.ts

export interface AuthUser {
  id: number;
  nama: string;
  role: 'ADMIN' | 'PENAGIH';
}

export const simpanSesi = (token: string, user: AuthUser) => {
  if (typeof window === 'undefined') return;

  // 1. Simpan di localStorage untuk kemudahan akses client-side
  localStorage.setItem('quennet_token', token);
  localStorage.setItem('quennet_user', JSON.stringify(user));

  // 2. Simpan di cookie agar bisa diakses oleh Next.js Server Components / Middleware
  // Berlaku selama 7 hari
  const maxAge = 7 * 24 * 60 * 60;
  document.cookie = `quennet_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `quennet_role=${user.role}; path=/; max-age=${maxAge}; SameSite=Lax`;
};

export const hapusSesi = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('quennet_token');
  localStorage.removeItem('quennet_user');
  document.cookie = 'quennet_token=; path=/; max-age=0';
  document.cookie = 'quennet_role=; path=/; max-age=0';
};