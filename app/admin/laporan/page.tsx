'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { ambilToken, hapusSesi } from '@/lib/auth';
import { ambilCache, simpanCache, formatWaktuCache } from '@/lib/cache';

interface DetailPembayaran {
  uangDiterima?: number;
  kembalian?: number;
  penagih?: string;
  tanggalBayar?: string;
}

interface Pelanggan {
  id: number;
  nama: string;
  kecamatan: string;
  desa: string;
  rt: string;
  tagihan: number;
  bulanMulai?: number;
  tahunMulai?: number;
  isLunas: boolean;
  statusPembayaran?: 'Lunas' | 'Belum_Lunas';
  detailPembayaran?: DetailPembayaran | null;
  nomorHp?: string;
}

interface LaporanKeuangan {
  periode: { bulan: number; tahun: number };
  ringkasanPelanggan: { totalPelanggan: number; sudahBayar: number; belumBayar: number };
  keuangan: {
    uangTerkumpul: number;
    uangTertunggak: number;
    targetTotal: number;
    formatRupiah: {
      uangTerkumpul: string;
      uangTertunggak: string;
      targetTotal: string;
    };
  };
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://quennet-backend-production.up.railway.app/api';

const DAFTAR_BULAN = [
  { no: 1, nama: 'Bulan 01 (Januari)' },
  { no: 2, nama: 'Bulan 02 (Februari)' },
  { no: 3, nama: 'Bulan 03 (Maret)' },
  { no: 4, nama: 'Bulan 04 (April)' },
  { no: 5, nama: 'Bulan 05 (Mei)' },
  { no: 6, nama: 'Bulan 06 (Juni)' },
  { no: 7, nama: 'Bulan 07 (Juli)' },
  { no: 8, nama: 'Bulan 08 (Agustus)' },
  { no: 9, nama: 'Bulan 09 (September)' },
  { no: 10, nama: 'Bulan 10 (Oktober)' },
  { no: 11, nama: 'Bulan 11 (November)' },
  { no: 12, nama: 'Bulan 12 (Desember)' },
];

export default function LaporanPage() {
  const router = useRouter();
  const [bulanPilihan, setBulanPilihan] = useState<number>(10);
  const [tahunPilihan, setTahunPilihan] = useState<number>(2026);
  const [isReady, setIsReady] = useState(false);

  const [laporan, setLaporan] = useState<LaporanKeuangan | null>(null);
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [loading, setLoading] = useState(true);

  // Status Sinkronisasi Cache
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [terakhirUpdate, setTerakhirUpdate] = useState<number | null>(null);
  const [dariCache, setDariCache] = useState(false);

  // 1. Inisialisasi tanggal lokal
  useEffect(() => {
    const sekarang = new Date();
    setBulanPilihan(sekarang.getMonth() + 1);
    setTahunPilihan(sekarang.getFullYear());
    setIsReady(true);
  }, []);

  // 2. Muat ringkasan laporan & list pelanggan periode aktif (Didukung Caching)
  const muatData = async (forceRefresh = false) => {
    if (!bulanPilihan || !tahunPilihan) return;

    const token = ambilToken();
    if (!token) return;

    const cacheKeyLap = `laporan_${bulanPilihan}_${tahunPilihan}`;
    const cacheKeyPel = `pelanggan_${bulanPilihan}_${tahunPilihan}`;

    // Cek cache jika bukan force refresh
    if (!forceRefresh) {
      const cacheLap = ambilCache<LaporanKeuangan>(cacheKeyLap);
      const cachePel = ambilCache<Pelanggan[]>(cacheKeyPel);

      if (cacheLap && cacheLap.data && cachePel && Array.isArray(cachePel.data)) {
        setLaporan(cacheLap.data);
        setPelangganList(cachePel.data);
        setTerakhirUpdate(cacheLap.timestamp);
        setDariCache(true);
        setLoading(false);

        // Jika umur cache masih segar (< 2 menit), tidak perlu background fetch
        const umurCacheMs = Date.now() - cacheLap.timestamp;
        if (umurCacheMs < 2 * 60 * 1000) {
          return;
        }
      }
    }

    if (!laporan && !ambilCache(cacheKeyLap)) {
      setLoading(true);
    } else {
      setIsRefreshing(true);
    }

    try {
      const refreshParam = forceRefresh ? '&refresh=true' : '';

      const [resLap, resPel] = await Promise.all([
        fetch(`${API_BASE_URL}/laporan?bulan=${bulanPilihan}&tahun=${tahunPilihan}${refreshParam}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_BASE_URL}/pelanggan?bulan=${bulanPilihan}&tahun=${tahunPilihan}${refreshParam}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!resLap.ok || !resPel.ok) {
        if (resLap.status === 401 || resPel.status === 401 || resLap.status === 403 || resPel.status === 403) {
          hapusSesi();
          router.push('/login');
          return;
        }
        throw new Error('Gagal mengambil data laporan dari server');
      }

      const jsonLap = await resLap.json();
      const jsonPel = await resPel.json();

      setLaporan(jsonLap);
      setPelangganList(jsonPel.data || []);

      simpanCache(cacheKeyLap, jsonLap);
      simpanCache(cacheKeyPel, jsonPel.data || []);
      setTerakhirUpdate(Date.now());
      setDariCache(false);
    } catch (err) {
      console.error('Gagal memuat laporan keuangan:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isReady) {
      muatData();
    }
  }, [isReady, bulanPilihan, tahunPilihan]);

  // Statistik Ringkasan
  const totalPelanggan = laporan?.ringkasanPelanggan.totalPelanggan ?? pelangganList.length;
  const totalLunas = laporan?.ringkasanPelanggan.sudahBayar ?? pelangganList.filter((p) => p.isLunas).length;
  const totalBelumLunas = laporan?.ringkasanPelanggan.belumBayar ?? pelangganList.filter((p) => !p.isLunas).length;
  const targetTotal = laporan?.keuangan.targetTotal ?? pelangganList.reduce((acc, p) => acc + (p.tagihan || 0), 0);
  const uangTerkumpul = laporan?.keuangan.uangTerkumpul ?? pelangganList
    .filter((p) => p.isLunas)
    .reduce((acc, p) => acc + (p.tagihan || 0), 0);
  const sisaTertunggak = targetTotal - uangTerkumpul;

  const persenCapaian = targetTotal > 0
    ? Math.round((uangTerkumpul / targetTotal) * 100)
    : 0;

  // Ekspor Excel
  const handleEksporExcel = () => {
    if (pelangganList.length === 0) {
      alert('Tidak ada data yang dapat diekspor!');
      return;
    }

    const dataRingkasan = [
      { 'Keterangan': 'Periode Laporan', 'Nilai': `Bulan ${bulanPilihan} Tahun ${tahunPilihan}` },
      { 'Keterangan': 'Total Warga Pelanggan', 'Nilai': totalPelanggan },
      { 'Keterangan': 'Jumlah Warga Sudah Lunas', 'Nilai': totalLunas },
      { 'Keterangan': 'Jumlah Warga Belum Bayar', 'Nilai': totalBelumLunas },
      { 'Keterangan': 'Total Uang Masuk (Rp)', 'Nilai': uangTerkumpul },
      { 'Keterangan': 'Sisa Uang Tertunggak (Rp)', 'Nilai': sisaTertunggak },
      { 'Keterangan': 'Target Total Potensi (Rp)', 'Nilai': targetTotal },
      { 'Keterangan': 'Persentase Realisasi', 'Nilai': `${persenCapaian}%` },
    ];

    const dataWarga = pelangganList.map((w, idx) => ({
      'No': idx + 1,
      'Kode Pelanggan': `QN-${tahunPilihan}${String(w.id).padStart(4, '0')}`,
      'Nama Warga': w.nama,
      'Desa': w.desa,
      'RT': w.rt,
      'Kecamatan': w.kecamatan,
      'Tarif Tagihan (Rp)': w.tagihan,
      'Status Bayar': w.isLunas ? 'LUNAS' : 'BELUM BAYAR',
      'Petugas Penagih': w.detailPembayaran?.penagih || (w.isLunas ? 'Kolektor RT' : '-'),
      'Tanggal Bayar': w.detailPembayaran?.tanggalBayar
        ? new Date(w.detailPembayaran.tanggalBayar).toLocaleDateString('id-ID')
        : '-',
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataRingkasan), 'Ringkasan Keuangan');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dataWarga), 'Daftar Tagihan Warga');

    XLSX.writeFile(wb, `Laporan_Keuangan_Quinnet_${bulanPilihan}_${tahunPilihan}.xlsx`);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* BEGIN: Hero Header Section with Curved Wave */}
      <div className="bg-dataseal-hero text-white relative pb-28 pt-8">
        {/* Decorative top glow spot */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* BEGIN: Hero Content Header */}
        <section className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                  Laporan &amp; Rekap Keuangan
                </span>
                <span className="text-xs text-blue-100 font-medium inline-flex items-center gap-1.5">
                  <span>Periode Bulan {bulanPilihan} / {tahunPilihan}</span>
                  {isRefreshing && <i className="fa-solid fa-arrows-rotate fa-spin text-xs text-cyan-200"></i>}
                </span>
                {terakhirUpdate && (
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-sm border transition flex items-center gap-1.5 ${
                      dariCache
                        ? 'bg-amber-400/20 text-amber-200 border-amber-300/30'
                        : 'bg-emerald-400/20 text-emerald-200 border-emerald-300/30'
                    }`}
                    title={dariCache ? 'Data laporan dari cache cepat' : 'Data terhubung langsung'}
                  >
                    <i className="fa-solid fa-bolt text-[10px]"></i>
                    <span>{dariCache ? 'Cache' : 'Tersinkron'} • {formatWaktuCache(terakhirUpdate)}</span>
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                Laporan Keuangan &amp; Arus Kas
              </h2>
              <p className="mt-1.5 text-sm text-blue-100 max-w-2xl font-medium">
                Analisis pendapatan setoran kas Wi-Fi, monitoring target omzet berkala, dan unduh rekapan pembukuan resmi RT/RW Net.
              </p>
            </div>

            {/* Period Filter & Export Action */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Month Picker */}
              <div className="flex items-center gap-2 bg-white/15 border border-white/25 px-3.5 py-2 rounded-xl text-white backdrop-blur-md shadow-sm">
                <i className="fa-regular fa-calendar text-cyan-200 text-sm"></i>
                <label className="sr-only" htmlFor="filter-bulan">Pilih Bulan</label>
                <select
                  id="filter-bulan"
                  value={bulanPilihan}
                  onChange={(e) => setBulanPilihan(Number(e.target.value))}
                  className="bg-transparent border-none text-xs sm:text-sm font-bold text-white focus:ring-0 p-0 cursor-pointer pr-1"
                >
                  {DAFTAR_BULAN.map((b) => (
                    <option key={b.no} value={b.no} className="text-slate-800 bg-white">
                      {b.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Input Badge */}
              <div className="flex items-center gap-1.5 bg-white/15 border border-white/25 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white tracking-wider font-mono backdrop-blur-md shadow-sm">
                <input
                  type="number"
                  value={tahunPilihan}
                  onChange={(e) => setTahunPilihan(Number(e.target.value))}
                  className="w-14 bg-transparent border-none text-xs sm:text-sm font-bold text-white focus:ring-0 p-0 text-center font-mono cursor-pointer"
                  title="Ubah tahun laporan"
                />
              </div>

              {/* Refresh / Segarkan Cache Button */}
              <button
                onClick={() => muatData(true)}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 bg-white/15 hover:bg-white/25 active:scale-95 border border-white/25 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white backdrop-blur-md shadow-sm transition cursor-pointer disabled:opacity-60"
                title="Segarkan cache laporan dan ambil kalkulasi terbaru dari database"
                type="button"
              >
                <i className={`fa-solid fa-arrows-rotate text-xs text-cyan-200 ${isRefreshing ? 'fa-spin' : ''}`}></i>
                <span>{isRefreshing ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
              </button>

              {/* Ekspor Excel Button */}
              <button
                onClick={handleEksporExcel}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
              >
                <i className="fa-solid fa-file-arrow-down text-sm"></i>
                <span>Ekspor Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </section>
        {/* END: Hero Content Header */}

        {/* Curved Wave Bottom Divider */}
        <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none pointer-events-none">
          <svg
            className="relative block w-full h-12 md:h-16 text-[#F4F8FD]"
            preserveAspectRatio="none"
            viewBox="0 0 1200 120"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0,0 C300,90 850,90 1200,0 L1200,120 L0,120 Z" fill="currentColor"></path>
          </svg>
        </div>
      </div>
      {/* END: Hero Header Section */}

      {/* BEGIN: MainContent */}
      <main className="flex-1 max-w-[1480px] w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-22 pb-12 space-y-7 relative z-10">
        {/* BEGIN: 4 Stat Cards */}
        <section aria-label="Statistik Pelanggan" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Stat 1: Total Pelanggan */}
          <div className="bg-white border border-[#E2ECF8] rounded-2xl p-5 shadow-dataseal hover:shadow-dataseal-hover transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Pelanggan</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-users"></i>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {totalPelanggan}
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">Warga terdaftar aktif</p>
            </div>
          </div>

          {/* Stat 2: Lunas Bulan Ini */}
          <div className="bg-white border border-[#E2ECF8] rounded-2xl p-5 shadow-dataseal hover:shadow-dataseal-hover transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Lunas Bulan {bulanPilihan}</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-circle-check"></i>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
                {totalLunas}
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                {persenCapaian}% telah melunasi tagihan
              </p>
            </div>
          </div>

          {/* Stat 3: Belum Lunas / Tertunggak */}
          <div className="bg-white border border-[#E2ECF8] rounded-2xl p-5 shadow-dataseal hover:shadow-dataseal-hover transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Belum Bayar</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform">
                <i className="fa-regular fa-clock"></i>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-extrabold text-amber-600 font-mono tracking-tight">
                {totalBelumLunas}
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">Menunggu pembayaran warga</p>
            </div>
          </div>

          {/* Stat 4: Estimasi Omset */}
          <div className="bg-white border border-[#E2ECF8] rounded-2xl p-5 shadow-dataseal hover:shadow-dataseal-hover transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Potensi Pendapatan</span>
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-600 flex items-center justify-center text-sm shadow-sm group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-wallet"></i>
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-[26px] font-extrabold text-blue-600 font-mono tracking-tight truncate">
                Rp {targetTotal.toLocaleString('id-ID')}
              </div>
              <p className="mt-1 text-xs text-slate-500 font-medium">
                Masuk: <span className="text-emerald-600 font-bold">Rp {uangTerkumpul.toLocaleString('id-ID')}</span>
              </p>
            </div>
          </div>
        </section>
        {/* END: 4 Stat Cards */}

        {/* BEGIN: Detailed Financial Breakdown Cards */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Progress Capaian Realisasi */}
          <div className="lg:col-span-2 bg-white border border-[#E2ECF8] rounded-2xl p-6 shadow-dataseal space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Analisis Setoran</span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-0.5">
                  Realisasi Kas Masuk Periode {bulanPilihan}/{tahunPilihan}
                </h3>
              </div>
              <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                <i className="fa-solid fa-chart-line text-[11px]"></i> {persenCapaian}% Tercapai
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>Progress Pembayaran Warga</span>
                <span>{totalLunas} dari {totalPelanggan} Warga</span>
              </div>
              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, persenCapaian))}%` }}
                ></div>
              </div>
            </div>

            {/* Matrix Uang Masuk vs Tertunggak */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Uang Diterima (Kas)</span>
                <p className="text-2xl font-extrabold text-emerald-600 font-mono tracking-tight mt-1">
                  Rp {uangTerkumpul.toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  Dari total {totalLunas} pelanggan yang telah lunas
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100/80">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">Sisa Tagihan Tertunggak</span>
                <p className="text-2xl font-extrabold text-amber-600 font-mono tracking-tight mt-1">
                  Rp {sisaTertunggak.toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Dari total {totalBelumLunas} pelanggan belum bayar
                </p>
              </div>
            </div>
          </div>

          {/* Quick Info & Ekspor Panel */}
          <div className="bg-white border border-[#E2ECF8] rounded-2xl p-6 shadow-dataseal flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-800">Rekapitulasi Pembukuan</span>
              </div>
              <h4 className="text-base font-extrabold text-slate-900 leading-snug">
                Unduh Data Lengkap Tagihan &amp; Pembayaran Warga
              </h4>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                File Excel mencakup 2 lembar kerja (*sheet*): ringkasan keuangan kas per bulan dan daftar status tagihan tiap warga pelanggan lengkap dengan nama penagih.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Total Potensi Kas:</span>
                <span className="font-bold text-slate-900 font-mono">Rp {targetTotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Periode Aktif:</span>
                <span className="font-bold text-blue-600 font-mono">Bulan {bulanPilihan} / {tahunPilihan}</span>
              </div>

              <button
                onClick={handleEksporExcel}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl shadow-md active:scale-95 transition cursor-pointer"
              >
                <i className="fa-solid fa-file-arrow-down text-sm"></i>
                <span>Unduh Rekap Excel (.xlsx)</span>
              </button>
            </div>
          </div>
        </section>
        {/* END: Detailed Financial Breakdown Cards */}
      </main>
      {/* END: MainContent */}
    </div>
  );
}