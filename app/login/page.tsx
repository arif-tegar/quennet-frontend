'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { simpanSesi, AuthUser } from '@/lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [lihatPassword, setLihatPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorPesan(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.status === 'gagal') {
        throw new Error(data.pesan || 'Login gagal, periksa username dan password Anda.');
      }

      // Ambil token dan user info dari response backend
      const token: string = data.token;
      const user: AuthUser = data.user;

      // Simpan sesi ke localStorage & cookie
      simpanSesi(token, user);

      // Pengalihan rute berdasarkan Role
      if (user.role === 'ADMIN') {
        router.push('/admin/pelanggan');
      } else {
        router.push('/penagih');
      }
    } catch (err: any) {
      setErrorPesan(err.message || 'Terjadi kesalahan pada server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#F4F8FD] text-slate-800 relative overflow-hidden selection:bg-blue-600 selection:text-white font-sans">
      {/* Top Gradient Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0052cc] via-[#0066ff] to-[#00c2ff] fixed top-0 left-0 z-50"></div>

      {/* Ambient Decorative Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Content Area */}
      <main className="max-w-md w-full mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col justify-center relative z-10">
        <div className="bg-white border border-[#E2ECF8] rounded-3xl p-6 sm:p-9 shadow-dataseal relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Subtle Top Card Gradient Highlight */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400"></div>

          {/* Header Logo & System Brand */}
          <div className="text-center mb-7">
            {/* Shield Wi-Fi Icon */}
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/25 mx-auto mb-3.5 transition-transform hover:scale-105 duration-200">
              <i className="fa-solid fa-shield-halved text-2xl text-white"></i>
              <span className="absolute inset-0 flex items-center justify-center text-xs text-cyan-200 font-bold -mt-0.5 ml-0.5">
                <i className="fa-solid fa-wifi text-sm"></i>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Quinnet <span className="text-blue-600">Wi-Fi</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Sistem Billing &amp; Penagihan RT/RW Net Sragen
            </p>
          </div>

          {/* Notifikasi Error */}
          {errorPesan && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
              <i className="fa-solid fa-circle-exclamation text-rose-500 mt-0.5 text-sm shrink-0"></i>
              <span className="flex-1 font-medium leading-relaxed">{errorPesan}</span>
              <button
                type="button"
                onClick={() => setErrorPesan(null)}
                className="text-rose-400 hover:text-rose-600 cursor-pointer p-0.5"
                title="Tutup pesan error"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

          {/* Form Login */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Username / Akun Petugas
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-500">
                  <i className="fa-solid fa-user text-xs"></i>
                </span>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username Anda"
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#F8FAFD] border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-500">
                  <i className="fa-solid fa-lock text-xs"></i>
                </span>
                <input
                  type={lihatPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-2.5 sm:py-3 bg-[#F8FAFD] border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition font-medium"
                />
                <button
                  type="button"
                  onClick={() => setLihatPassword(!lihatPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title={lihatPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  <i className={`fa-solid ${lihatPassword ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                </button>
              </div>
            </div>

            {/* Tombol Masuk */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:from-blue-700 active:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-sm text-white shadow-lg glow-btn active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                  <span>Memverifikasi Akun...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </>
              )}
            </button>
          </form>

          {/* Card Footer Security Indicator */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5 text-slate-600">
              <i className="fa-solid fa-circle-check text-emerald-600 text-xs"></i>
              <span>Sesi Terenkripsi Aman</span>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">v2.4 Sragen</span>
          </div>
        </div>
      </main>

      {/* BEGIN: PageFooter */}
      <footer className="py-4 px-4 text-center text-xs text-slate-500 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-600">Sistem Gateway MikroTik CCR Terkoneksi</span>
        </div>
        <p className="text-slate-400">
          © 2026 Quinnet Wi-Fi Sragen. Dikembangkan untuk kemudahan manajemen RT/RW Net.
        </p>
      </footer>
      {/* END: PageFooter */}
    </div>
  );
}