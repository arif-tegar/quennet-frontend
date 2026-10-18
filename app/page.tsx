'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('quinnet_token') || localStorage.getItem('quennet_token');
    const rawUser = localStorage.getItem('quinnet_user') || localStorage.getItem('quennet_user');

    if (!token || !rawUser) {
      router.replace('/login');
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      if (user.role === 'ADMIN') {
        router.replace('/admin/pelanggan');
      } else {
        router.replace('/penagih');
      }
    } catch {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F8FD] p-4">
      <div className="flex flex-col items-center justify-center gap-3 text-center animate-in fade-in">
        <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-blue-600/30">
          Q
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-sm font-semibold">
          <i className="fa-solid fa-circle-notch fa-spin text-blue-600"></i>
          <span>Memuat Quinnet Wi-Fi...</span>
        </div>
      </div>
    </div>
  );
}
