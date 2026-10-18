'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { hapusSesi } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [namaAdmin, setNamaAdmin] = useState('Admin');
  const [notifBuka, setNotifBuka] = useState(false);

  useEffect(() => {
    const rawUser = localStorage.getItem('quinnet_user') || localStorage.getItem('quennet_user');
    const token = localStorage.getItem('quinnet_token') || localStorage.getItem('quennet_token');

    if (!token || !rawUser) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      if (user.role !== 'ADMIN') {
        router.push('/penagih');
        return;
      }
      setNamaAdmin(user.nama || 'Admin');
    } catch {
      router.push('/login');
    }
  }, [router]);

  const handleLogout = () => {
    hapusSesi();
    router.push('/login');
  };

  const getInitials = (name: string) => {
    if (!name) return 'AD';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F8FD] text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* BEGIN: MainHeader */}
      <header className="bg-gradient-to-r from-[#0052cc] via-[#0066ff] to-[#0099ff] border-b border-white/15 backdrop-blur-md sticky top-0 z-50 shadow-sm text-white">
        <div className="max-w-[1480px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between min-h-[3.75rem] sm:min-h-[4.5rem] py-2 sm:py-3.5">
            {/* Left: Logo & Portal Badge */}
            <div className="flex items-center gap-3 sm:gap-6 lg:gap-8 min-w-0">
              <Link href="/admin/pelanggan" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
                {/* Shield Wi-Fi Brand Icon */}
                <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-md shadow-blue-900/20 group-hover:scale-105 transition-transform shrink-0">
                  <i className="fa-solid fa-shield-halved text-lg sm:text-xl text-blue-600"></i>
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] sm:text-[11px] text-sky-500 font-bold -mt-0.5 ml-0.5">
                    <i className="fa-solid fa-wifi text-[10px] sm:text-[11px]"></i>
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30 mb-0.5">
                    Admin Portal
                  </span>
                  <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-white flex items-center gap-1 sm:gap-1.5 whitespace-nowrap leading-none sm:leading-tight">
                    Quinnet <span className="text-cyan-200">Wi-Fi</span>
                  </h1>
                </div>
              </Link>

              {/* Primary Navigation Tabs */}
              <nav className="hidden md:flex items-center gap-1.5 bg-black/15 p-1.5 rounded-xl border border-white/15 backdrop-blur-md">
                <Link
                  href="/admin/pelanggan"
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    pathname.includes('/admin/pelanggan')
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <i className="fa-solid fa-users mr-2 text-xs"></i>Data Pelanggan
                </Link>
                <Link
                  href="/admin/laporan"
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    pathname.includes('/admin/laporan')
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <i className="fa-solid fa-chart-pie mr-2 text-xs"></i>Laporan Keuangan
                </Link>
              </nav>
            </div>

            {/* Right: Admin Profile, Switch Role & Logout */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => setNotifBuka(!notifBuka)}
                  className="relative p-1.5 sm:p-2 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Notifikasi Tagihan"
                >
                  <i className="fa-regular fa-bell text-base sm:text-lg"></i>
                  <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-2 h-2 rounded-full bg-amber-300 ring-2 ring-blue-600 animate-pulse"></span>
                </button>

                {notifBuka && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 text-slate-800 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                      <span className="font-bold text-xs text-slate-800">Notifikasi Sistem</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">Baru</span>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-blue-50/60">
                        <i className="fa-solid fa-circle-check text-blue-600 mt-0.5 text-xs"></i>
                        <div>
                          <p className="font-semibold text-slate-800">MikroTik CCR Terkoneksi</p>
                          <p className="text-[11px] text-slate-500">Gateway router aktif dan sinkron.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50">
                        <i className="fa-solid fa-calendar-check text-emerald-600 mt-0.5 text-xs"></i>
                        <div>
                          <p className="font-semibold text-slate-800">Periode Tagihan Aktif</p>
                          <p className="text-[11px] text-slate-500">Tagihan berjalan siap ditagih oleh kolektor.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* User Info Pill */}
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-white/15 rounded-xl border border-white/20 backdrop-blur-md">
                <div className="w-7 h-7 rounded-lg bg-white text-blue-700 font-bold text-xs flex items-center justify-center shadow-sm">
                  {getInitials(namaAdmin)}
                </div>
                <div className="text-xs">
                  <span className="text-white/80">Halo, </span>
                  <span className="font-bold text-white">{namaAdmin}</span>
                  <span className="text-[10px] text-blue-900 bg-white/90 px-1.5 py-0.5 rounded ml-1 font-bold">ADMIN</span>
                </div>
              </div>

              {/* Collector Mode Switch */}
              <Link
                href="/penagih"
                className="inline-flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs font-semibold rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 transition-all backdrop-blur-md shrink-0"
                title="Beralih ke Mode Penagih"
              >
                <span>Penagih</span>
                <i className="fa-solid fa-arrow-right text-[10px] sm:text-xs text-cyan-200"></i>
              </Link>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center gap-1.5 p-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold rounded-xl bg-red-500/25 hover:bg-red-500/40 text-white border border-red-300/30 transition-all backdrop-blur-md cursor-pointer shrink-0"
                title="Keluar dari sistem"
              >
                <i className="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation Bar */}
          <div className="md:hidden flex items-center justify-around pb-3 pt-1 border-t border-white/10 text-xs font-semibold">
            <Link
              href="/admin/pelanggan"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                pathname.includes('/admin/pelanggan')
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-users text-xs"></i>
              <span>Data Pelanggan</span>
            </Link>
            <Link
              href="/admin/laporan"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                pathname.includes('/admin/laporan')
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <i className="fa-solid fa-chart-pie text-xs"></i>
              <span>Laporan Keuangan</span>
            </Link>
          </div>
        </div>
      </header>
      {/* END: MainHeader */}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>

      {/* BEGIN: MainFooter */}
      <footer className="border-t border-[#E2ECF8] bg-white py-5 mt-auto">
        <div className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-medium text-slate-600">Sistem Quinnet Billing v2.4 — Gateway MikroTik CCR terhubung normal</span>
          </div>
          <div className="text-slate-500 text-center sm:text-right">
            © 2026 Quinnet Wi-Fi Sragen. Dikembangkan untuk kemudahan manajemen RT/RW Net.
          </div>
        </div>
      </footer>
      {/* END: MainFooter */}
    </div>
  );
}