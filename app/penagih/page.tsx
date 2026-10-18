'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { hapusSesi } from '@/lib/auth';

interface DetailPembayaran {
  uangDiterima: number;
  kembalian: number;
  penagih: string;
  tanggalBayar: string;
}

interface Pelanggan {
  id: number;
  nama: string;
  kecamatan: string;
  desa: string;
  rt: string;
  tagihan: number;
  isLunas: boolean;
  statusPembayaran: 'Lunas' | 'Belum_Lunas';
  detailPembayaran: DetailPembayaran | null;
  nomorHp?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const AVATAR_COLORS = [
  'bg-blue-50 text-blue-600 border-blue-100',
  'bg-purple-50 text-purple-600 border-purple-100',
  'bg-emerald-50 text-emerald-600 border-emerald-100',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-cyan-50 text-cyan-700 border-cyan-100',
  'bg-indigo-50 text-indigo-600 border-indigo-100',
];

export default function PenagihPage() {
  const router = useRouter();

  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorPesan, setErrorPesan] = useState<string | null>(null);

  // User State
  const [namaUser, setNamaUser] = useState<string>('Mas Nabil');
  const [userRole, setUserRole] = useState<string>('PENAGIH');
  const [bulanSekarangNama, setBulanSekarangNama] = useState<string>('Bulan Ini');
  const [tahunSekarang, setTahunSekarang] = useState<number>(2026);
  const [tanggalHariIni, setTanggalHariIni] = useState<string>('');

  // Filter States
  const [kataKunci, setKataKunci] = useState('');
  const [filterDesa, setFilterDesa] = useState<string>('SEMUA');
  const [filterRT, setFilterRT] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [urutkanBerdasarkan, setUrutkanBerdasarkan] = useState<'default' | 'belumBayar' | 'nama'>('belumBayar');

  // Payment Execution State
  const [inputUang, setInputUang] = useState<Record<number, string>>({});
  const [terpilihBayarId, setTerpilihBayarId] = useState<number | null>(null);
  const [prosesId, setProsesId] = useState<number | null>(null);

  // Struk Print Modal State
  const [pelangganStruk, setPelangganStruk] = useState<Pelanggan | null>(null);
  const strukRef = useRef<HTMLDivElement>(null);

  // 1. Ambil data sesi user & tanggal lokal di klien
  useEffect(() => {
    const sekarang = new Date();
    setBulanSekarangNama(sekarang.toLocaleDateString('id-ID', { month: 'short' }));
    setTahunSekarang(sekarang.getFullYear());
    setTanggalHariIni(sekarang.toLocaleDateString('id-ID'));

    const rawUser = localStorage.getItem('quennet_user');
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        // Bersihkan suffix jika nama user di database/localStorage sudah memiliki '(Penagih)' atau '(Admin)'
        const namaBersih = (u.nama || 'Mas Nabil')
          .replace(/\s*\((Penagih|Admin)\)/gi, '')
          .trim();
        setNamaUser(namaBersih || 'Mas Nabil');
        setUserRole(u.role || 'PENAGIH');
      } catch {}
    }
  }, []);

  // 2. Fetch data pelanggan dari backend
  const fetchPelanggan = async () => {
    const token = localStorage.getItem('quennet_token');
    if (!token) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setErrorPesan(null);

    try {
      const res = await fetch(`${API_BASE_URL}/pelanggan`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok || json.status === 'gagal') {
        if (res.status === 401 || res.status === 403) {
          hapusSesi();
          router.push('/login');
          return;
        }
        throw new Error(json.pesan || 'Gagal memuat data pelanggan');
      }

      setPelangganList(json.data || []);
    } catch (err: any) {
      setErrorPesan(err.message || 'Terjadi kesalahan jaringan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPelanggan();
  }, []);

  // Daftar Unik Desa & RT
  const listDesaUnik = useMemo(() => {
    const setDesa = new Set(pelangganList.map((p) => p.desa).filter(Boolean));
    return Array.from(setDesa);
  }, [pelangganList]);

  const listRTUnik = useMemo(() => {
    const terfilter =
      filterDesa === 'SEMUA'
        ? pelangganList
        : pelangganList.filter((p) => p.desa === filterDesa);
    const setRT = new Set(terfilter.map((p) => p.rt).filter(Boolean));
    return Array.from(setRT);
  }, [pelangganList, filterDesa]);

  // Pelanggan Terfilter
  const dataTampil = useMemo(() => {
    const filtered = pelangganList.filter((p) => {
      const q = kataKunci.toLowerCase().trim();
      const matchKunci =
        !q ||
        p.nama.toLowerCase().includes(q) ||
        p.desa.toLowerCase().includes(q) ||
        p.rt.toLowerCase().includes(q) ||
        p.kecamatan.toLowerCase().includes(q);

      const matchDesa = filterDesa === 'SEMUA' || p.desa === filterDesa;
      const matchRT = filterRT === 'SEMUA' || p.rt === filterRT;

      const matchStatus =
        filterStatus === 'SEMUA' ||
        (filterStatus === 'LUNAS' && p.isLunas) ||
        (filterStatus === 'BELUM' && !p.isLunas);

      return matchKunci && matchDesa && matchRT && matchStatus;
    });

    // Sorting
    return [...filtered].sort((a, b) => {
      if (urutkanBerdasarkan === 'belumBayar') {
        // Belum bayar didahulukan
        if (a.isLunas === b.isLunas) return a.nama.localeCompare(b.nama);
        return a.isLunas ? 1 : -1;
      }
      if (urutkanBerdasarkan === 'nama') {
        return a.nama.localeCompare(b.nama);
      }
      return 0;
    });
  }, [pelangganList, kataKunci, filterDesa, filterRT, filterStatus, urutkanBerdasarkan]);

  // Ringkasan KPI Header
  const totalWarga = pelangganList.length;
  const totalTagihanSemua = pelangganList.reduce((acc, p) => acc + (p.tagihan || 0), 0);
  const wargaLunas = pelangganList.filter((p) => p.isLunas);
  const wargaBelumLunas = pelangganList.filter((p) => !p.isLunas);
  const totalUangTerkumpul = wargaLunas.reduce((acc, p) => acc + (p.tagihan || 0), 0);
  const totalSisaTagihan = wargaBelumLunas.reduce((acc, p) => acc + (p.tagihan || 0), 0);

  // Input Uang Handler
  const handleUangChange = (id: number, val: string) => {
    setInputUang((prev) => ({ ...prev, [id]: val }));
  };

  // Quick Preset Nominal (Uang Pas, 150rb, 200rb, 500rb)
  const setPresetUang = (id: number, nominal: number) => {
    setInputUang((prev) => ({ ...prev, [id]: nominal.toString() }));
  };

  // Eksekusi Bayar (POST /api/bayar)
  const handleBayar = async (p: Pelanggan) => {
    const nominal = Number(inputUang[p.id] || p.tagihan);

    if (nominal < p.tagihan) {
      alert(`Uang pembayaran kurang! Minimal Rp ${p.tagihan.toLocaleString('id-ID')}`);
      return;
    }

    const token = localStorage.getItem('quennet_token');
    setProsesId(p.id);

    try {
      const res = await fetch(`${API_BASE_URL}/bayar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idPelanggan: p.id,
          uangDiterima: nominal,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.status === 'gagal') {
        throw new Error(json.pesan || 'Gagal mencatat pembayaran');
      }

      // Reset state input
      setInputUang((prev) => {
        const copy = { ...prev };
        delete copy[p.id];
        return copy;
      });
      setTerpilihBayarId(null);

      await fetchPelanggan();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setProsesId(null);
    }
  };

  // Batalkan Pembayaran (POST /api/batal-bayar)
  const handleBatal = async (p: Pelanggan) => {
    if (!confirm(`Batalkan status lunas untuk ${p.nama}? Tagihan akan kembali menjadi belum bayar.`)) return;

    const token = localStorage.getItem('quennet_token');
    setProsesId(p.id);

    try {
      const res = await fetch(`${API_BASE_URL}/batal-bayar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          idPelanggan: p.id,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.status === 'gagal') {
        throw new Error(json.pesan || 'Gagal membatalkan status pembayaran');
      }

      await fetchPelanggan();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan jaringan');
    } finally {
      setProsesId(null);
    }
  };

  // Cetak Struk
  const handleCetakStruk = (p: Pelanggan) => {
    setPelangganStruk(p);
  };

  const handlePrintWindow = () => {
    window.print();
  };

  const handleLogout = () => {
    hapusSesi();
    router.push('/login');
  };

  // Inisial Nama & Warna Avatar
  const getAvatar = (nama: string, id: number) => {
    const parts = nama.trim().split(' ').filter(Boolean);
    const inisial =
      parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : nama.slice(0, 2).toUpperCase();
    const warnaClass = AVATAR_COLORS[id % AVATAR_COLORS.length];
    return { inisial, warnaClass };
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* BEGIN: MainHeaderSection */}
      <header className="bg-gradient-to-r from-[#0052FF] via-[#0099FF] to-[#00C6FF] text-white shadow-lg relative pt-6 px-4 sm:px-6 lg:px-8 pb-7">
        <div className="max-w-7xl mx-auto">
          {/* Top Bar: Logo, User Badge, and Action Buttons */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/20">
            {/* Logo and Current Agent Info */}
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 bg-white text-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-md tracking-wider">
                Q
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold tracking-tight">Quennet Billing</h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                    Mode Lapangan
                  </span>
                </div>
                <p className="text-sm text-blue-100 font-medium mt-0.5">
                  Petugas: <span className="font-bold text-white">{namaUser}</span>{' '}
                  <span className="text-blue-200 font-normal">
                    ({userRole === 'ADMIN' ? 'Admin' : 'Penagih'})
                  </span>
                </p>
              </div>
            </div>

            {/* Navigation Utilities */}
            <div className="flex items-center flex-wrap gap-2.5">
              {userRole === 'ADMIN' && (
                <Link
                  href="/admin/pelanggan"
                  className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/25 transition backdrop-blur-md shadow-sm"
                >
                  <i className="fa-solid fa-arrow-left text-xs mr-1.5 text-cyan-200"></i>
                  <span>Portal Admin</span>
                </Link>
              )}

              <button
                onClick={fetchPelanggan}
                className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 text-white border border-white/25 transition backdrop-blur-md"
                title="Segarkan data tagihan"
                type="button"
              >
                <i className={`fa-solid fa-rotate-right text-xs mr-1.5 ${loading ? 'fa-spin' : ''}`}></i>
                <span>Refresh</span>
              </button>

              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-red-500/80 hover:bg-red-600 text-white transition shadow-sm border border-red-400/30 cursor-pointer"
                type="button"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
                <span>Keluar</span>
              </button>
            </div>
          </div>

          {/* Quick Summary Stats (KPI Cards) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-6">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/20 shadow-sm min-w-0">
              <p className="text-[11px] sm:text-xs text-blue-100 uppercase tracking-wider font-semibold truncate">Target RT / Hari Ini</p>
              <p className="text-xl sm:text-2xl font-extrabold text-white mt-1 font-mono truncate">{totalWarga} Warga</p>
              <p className="text-[11px] sm:text-xs text-blue-200 mt-0.5 truncate">Total: Rp {totalTagihanSemua.toLocaleString('id-ID')}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/20 shadow-sm min-w-0">
              <p className="text-[11px] sm:text-xs text-emerald-200 uppercase tracking-wider font-semibold truncate">Sudah Ditagih</p>
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-300 mt-1 font-mono truncate">{wargaLunas.length} LUNAS</p>
              <p className="text-[11px] sm:text-xs text-emerald-100 mt-0.5 truncate">Rp {totalUangTerkumpul.toLocaleString('id-ID')} terkumpul</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/20 shadow-sm min-w-0">
              <p className="text-[11px] sm:text-xs text-amber-200 uppercase tracking-wider font-semibold truncate">Sisa Tagihan</p>
              <p className="text-xl sm:text-2xl font-extrabold text-amber-300 mt-1 font-mono truncate">{wargaBelumLunas.length} Belum Bayar</p>
              <p className="text-[11px] sm:text-xs text-amber-100 mt-0.5 truncate">Sisa: Rp {totalSisaTagihan.toLocaleString('id-ID')}</p>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 border border-white/20 shadow-sm min-w-0">
              <p className="text-[11px] sm:text-xs text-cyan-200 uppercase tracking-wider font-semibold truncate">Uang Tunai di Tangan</p>
              <p className="text-xl sm:text-2xl font-extrabold text-white mt-1 font-mono truncate">Rp {totalUangTerkumpul.toLocaleString('id-ID')}</p>
              <p className="text-[11px] sm:text-xs text-cyan-100 mt-0.5 truncate">Siap setor kas</p>
            </div>
          </div>
        </div>
      </header>
      {/* END: MainHeaderSection */}

      {/* BEGIN: MainContentSection */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 w-full pb-14 mt-6">
        {/* Notifikasi Error */}
        {errorPesan && (
          <div className="mb-5 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs sm:text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation text-rose-500"></i>
              <span>{errorPesan}</span>
            </div>
            <button onClick={() => setErrorPesan(null)} className="text-rose-500 hover:text-rose-700">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* Filter Bar Card */}
        <section className="bg-white rounded-2xl shadow-md border border-slate-200/80 p-4 sm:p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Search */}
            <div className="md:col-span-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="search-warga">
                Cari Nama Warga / RT / Alamat
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                  </svg>
                </span>
                <input
                  id="search-warga"
                  type="text"
                  value={kataKunci}
                  onChange={(e) => setKataKunci(e.target.value)}
                  placeholder="Contoh: Pak Supri, RT 01..."
                  className="block w-full pl-9 pr-3 py-2 text-sm border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-slate-50 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Filter Desa */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="filter-desa">
                Pilih Desa
              </label>
              <select
                id="filter-desa"
                value={filterDesa}
                onChange={(e) => {
                  setFilterDesa(e.target.value);
                  setFilterRT('SEMUA');
                }}
                className="block w-full py-2 px-3 text-sm border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-slate-50 font-medium text-slate-700 cursor-pointer"
              >
                <option value="SEMUA">Semua Desa</option>
                {listDesaUnik.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter RT */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="filter-rt">
                Pilih RT
              </label>
              <select
                id="filter-rt"
                value={filterRT}
                onChange={(e) => setFilterRT(e.target.value)}
                className="block w-full py-2 px-3 text-sm border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-slate-50 font-medium text-slate-700 cursor-pointer"
              >
                <option value="SEMUA">Semua RT</option>
                {listRTUnik.map((rt) => (
                  <option key={rt} value={rt}>
                    RT {rt}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status Bayar */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5" htmlFor="filter-status">
                Status Bayar
              </label>
              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="block w-full py-2 px-3 text-sm border-slate-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-slate-50 font-medium text-slate-700 cursor-pointer"
              >
                <option value="SEMUA">Semua</option>
                <option value="LUNAS">Lunas</option>
                <option value="BELUM">Belum Bayar</option>
              </select>
            </div>
          </div>
        </section>

        {/* Header Actions and List Title */}
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Daftar Tagihan Pelanggan Lapangan</h2>
            <p className="text-xs text-slate-500">
              Menampilkan {dataTampil.length} pelanggan penagihan wilayah RT aktif
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() =>
                setUrutkanBerdasarkan((prev) =>
                  prev === 'belumBayar' ? 'nama' : prev === 'nama' ? 'default' : 'belumBayar'
                )
              }
              className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition border border-slate-200 cursor-pointer"
              type="button"
            >
              <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
              <span>
                {urutkanBerdasarkan === 'belumBayar'
                  ? 'Prioritas: Belum Bayar'
                  : urutkanBerdasarkan === 'nama'
                  ? 'Urut Nama A-Z'
                  : 'Urutan Default'}
              </span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-col items-center justify-center gap-2">
              <i className="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600"></i>
              <span className="text-xs font-semibold">Memuat daftar tagihan warga...</span>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && dataTampil.length === 0 && (
          <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
            <i className="fa-regular fa-folder-open text-3xl text-slate-300"></i>
            <p className="text-sm font-bold text-slate-600 mt-2">Tidak ada pelanggan di wilayah ini</p>
            <p className="text-xs text-slate-400 mt-0.5">Silakan sesuaikan pilihan desa, RT, atau kata kunci pencarian.</p>
          </div>
        )}

        {/* BEGIN: CustomerBillingCardsList */}
        {!loading && dataTampil.length > 0 && (
          <div className="space-y-4">
            {dataTampil.map((p) => {
              const { inisial, warnaClass } = getAvatar(p.nama, p.id);
              const uangMasuk = Number(inputUang[p.id] || p.tagihan);
              const uangKembalian = uangMasuk >= p.tagihan ? uangMasuk - p.tagihan : 0;
              const isSedangProses = prosesId === p.id;
              const isInputTerbuka = terpilihBayarId === p.id;

              // Pesan WA
              const pesanWa = p.isLunas
                ? `Halo Bpk/Ibu ${p.nama}, terima kasih pembayaran iuran Wi-Fi Quennet sebesar Rp ${p.tagihan.toLocaleString('id-ID')} telah diterima oleh ${namaUser}. Status: LUNAS.`
                : `Halo Bpk/Ibu ${p.nama}, menginformasikan tagihan Wi-Fi Quennet bulan ini sebesar Rp ${p.tagihan.toLocaleString('id-ID')}. Petugas kami (${namaUser}) sedang bertugas penagihan di wilayah RT Anda. Terima kasih.`;

              return (
                <article
                  key={p.id}
                  className={`rounded-2xl shadow-sm border p-5 hover:shadow-md transition ${
                    p.isLunas
                      ? 'bg-white border-slate-200/90'
                      : 'bg-amber-50/40 border-amber-200/80'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left Info: Avatar, Name, Badge, Address, Package */}
                    <div className="flex items-start space-x-3.5">
                      <div
                        className={`w-11 h-11 rounded-xl font-bold flex items-center justify-center text-sm border shrink-0 ${warnaClass}`}
                      >
                        {inisial}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-bold text-slate-900 leading-snug">{p.nama}</h3>
                          {p.isLunas ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  clipRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  fillRule="evenodd"
                                ></path>
                              </svg>
                              LUNAS
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
                              <svg className="w-3 h-3 mr-1 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                ></path>
                              </svg>
                              BELUM BAYAR
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 flex items-center mt-0.5">
                          <svg className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                            ></path>
                            <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                          </svg>
                          <span>
                            {p.desa} — RT {p.rt} <span className="text-slate-400">({p.kecamatan})</span>
                          </span>
                        </p>

                        <div className="mt-2 text-xs font-semibold text-slate-400">
                          {p.isLunas ? (
                            <span>
                              Paket: <span className="text-slate-600">{p.tagihan <= 150000 ? '20 Mbps Home Fiber' : '35 Mbps Pro Gamer'}</span>
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Jatuh Tempo: <span className="text-amber-700 font-bold">20 {bulanSekarangNama} • Tagihan siap ditagih</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Center Info: Tagihan & Detail */}
                    <div className="md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 flex flex-col md:items-end justify-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {p.isLunas ? 'TAGIHAN' : 'TOTAL TAGIHAN'}
                      </span>
                      <span className={`text-xl sm:text-2xl font-black ${p.isLunas ? 'text-blue-600' : 'text-rose-600'}`}>
                        Rp {p.tagihan.toLocaleString('id-ID')}
                      </span>

                      {p.isLunas ? (
                        <div className="text-xs text-slate-500 mt-1 flex items-center space-x-2">
                          <span>
                            Diterima: <strong className="text-slate-700">Rp {(p.detailPembayaran?.uangDiterima || p.tagihan).toLocaleString('id-ID')}</strong>
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-emerald-600 font-semibold">
                            Kembali: Rp {(p.detailPembayaran?.kembalian || 0).toLocaleString('id-ID')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500 mt-0.5">
                          {p.tagihan <= 150000 ? 'Tarif Bulanan Paket 20 Mbps' : 'Tarif Bulanan Pro Gamer'}
                        </span>
                      )}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 justify-start sm:justify-end flex-wrap">
                      {p.isLunas ? (
                        <>
                          <button
                            onClick={() => handleCetakStruk(p)}
                            className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200 cursor-pointer"
                            type="button"
                          >
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                              ></path>
                            </svg>
                            <span>Cetak Struk</span>
                          </button>

                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(pesanWa)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          >
                            <i className="fa-brands fa-whatsapp text-sm text-emerald-600 mr-1.5"></i>
                            <span>Kirim WA</span>
                          </a>

                          <button
                            onClick={() => handleBatal(p)}
                            disabled={isSedangProses}
                            className="inline-flex items-center px-3 py-2 text-xs font-bold rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                            type="button"
                          >
                            <span>{isSedangProses ? 'Batal...' : 'Batal'}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(pesanWa)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition"
                          >
                            <svg className="w-4 h-4 mr-1 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                              ></path>
                            </svg>
                            <span>Ingatkan WA</span>
                          </a>

                          <button
                            onClick={() => setTerpilihBayarId(isInputTerbuka ? null : p.id)}
                            className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg transition shadow-sm hover:shadow cursor-pointer ${
                              isInputTerbuka
                                ? 'bg-slate-700 text-white'
                                : 'text-white bg-blue-600 hover:bg-blue-700'
                            }`}
                            type="button"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M12 6v6m0 0v6m0-6h6m-6 0H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                            </svg>
                            <span>{isInputTerbuka ? 'Tutup' : 'Terima Bayar'}</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Drawer Input Setoran Tunai (Bisa dibuka ketika klik 'Terima Bayar') */}
                  {!p.isLunas && isInputTerbuka && (
                    <div className="mt-4 pt-4 border-t border-amber-200/80 bg-white/70 p-4 rounded-xl animate-in fade-in slide-in-from-top-1">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Preset Cepat */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">Preset Uang:</span>
                          <button
                            type="button"
                            onClick={() => setPresetUang(p.id, p.tagihan)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
                          >
                            Uang Pas (Rp {p.tagihan.toLocaleString('id-ID')})
                          </button>
                          <button
                            type="button"
                            onClick={() => setPresetUang(p.id, 200000)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                          >
                            Rp 200.000
                          </button>
                          <button
                            type="button"
                            onClick={() => setPresetUang(p.id, 300000)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                          >
                            Rp 300.000
                          </button>
                        </div>

                        {/* Input & Action */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 sm:w-48">
                            <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">Rp</span>
                            <input
                              type="number"
                              placeholder={p.tagihan.toString()}
                              value={inputUang[p.id] ?? ''}
                              onChange={(e) => handleUangChange(p.id, e.target.value)}
                              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                            />
                          </div>

                          <button
                            onClick={() => handleBayar(p)}
                            disabled={isSedangProses || uangMasuk < p.tagihan}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-md shadow-emerald-600/20 cursor-pointer shrink-0"
                            type="button"
                          >
                            {isSedangProses ? 'Menyimpan...' : 'Konfirmasi Setor'}
                          </button>
                        </div>
                      </div>

                      {/* Kalkulator Kembalian Otomatis */}
                      {uangMasuk > 0 && (
                        <div
                          className={`mt-3 p-3 rounded-xl text-xs flex justify-between items-center ${
                            uangMasuk >= p.tagihan
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                              : 'bg-rose-50 border border-rose-200 text-rose-700'
                          }`}
                        >
                          <span>
                            {uangMasuk >= p.tagihan ? 'Uang Kembalian Warga:' : 'Uang Diterima Kurang:'}
                          </span>
                          <span className="font-extrabold text-sm font-mono">
                            Rp {Math.abs(uangKembalian > 0 ? uangKembalian : p.tagihan - uangMasuk).toLocaleString('id-ID')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {/* END: CustomerBillingCardsList */}

        {/* BEGIN: QuickDepositFloatingBar */}
        <section className="mt-8 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3 text-sm text-slate-600">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-800">
                Total Uang Tunai Diterima: <span className="text-emerald-600 font-mono font-extrabold">Rp {totalUangTerkumpul.toLocaleString('id-ID')}</span>
              </p>
              <p className="text-xs text-slate-500">
                {wargaLunas.length} transaksi lunas • {wargaBelumLunas.length} transaksi belum tertagih
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => alert(`Rekap Harian Kolektor:\n• Petugas: ${namaUser}\n• Total Ditagih: ${wargaLunas.length} warga\n• Kas Masuk: Rp ${totalUangTerkumpul.toLocaleString('id-ID')}\n• Sisa Tertunggak: Rp ${totalSisaTagihan.toLocaleString('id-ID')}`)}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 text-xs font-bold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              type="button"
            >
              <svg className="w-4 h-4 mr-1.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
              <span>Rekap Harian</span>
            </button>

            <button
              onClick={() => alert(`Kas Kolektor Sebesar Rp ${totalUangTerkumpul.toLocaleString('id-ID')} siap disetorkan ke Bendahara Admin Quennet.`)}
              className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm cursor-pointer"
              type="button"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
              <span>Setor Kas Kolektor</span>
            </button>
          </div>
        </section>
        {/* END: QuickDepositFloatingBar */}
      </main>
      {/* END: MainContentSection */}

      {/* BEGIN: Struk Cetak Modal */}
      {pelangganStruk && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-sm w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
            {/* Area Struk Termal yang dicetak */}
            <div ref={strukRef} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-3 font-mono text-xs text-slate-800">
              <div className="border-b border-dashed border-slate-300 pb-2">
                <h4 className="text-sm font-black tracking-wide uppercase">QUENNET WI-FI</h4>
                <p className="text-[10px] text-slate-500">Bukti Pembayaran Tagihan Internet</p>
              </div>

              <div className="space-y-1.5 text-left text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama:</span>
                  <span className="font-bold">{pelangganStruk.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Alamat:</span>
                  <span>{pelangganStruk.desa} - RT {pelangganStruk.rt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal:</span>
                  <span>
                    {pelangganStruk.detailPembayaran?.tanggalBayar
                      ? new Date(pelangganStruk.detailPembayaran.tanggalBayar).toLocaleDateString('id-ID')
                      : tanggalHariIni || 'Hari ini'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Petugas:</span>
                  <span>{pelangganStruk.detailPembayaran?.penagih || namaUser}</span>
                </div>
              </div>

              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 text-left text-xs font-bold">
                <div className="flex justify-between">
                  <span>TAGIHAN:</span>
                  <span>Rp {pelangganStruk.tagihan.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600 font-normal text-[11px]">
                  <span>Diterima:</span>
                  <span>Rp {(pelangganStruk.detailPembayaran?.uangDiterima || pelangganStruk.tagihan).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold text-[11px]">
                  <span>Kembali:</span>
                  <span>Rp {(pelangganStruk.detailPembayaran?.kembalian || 0).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 text-center pt-1">
                <p className="font-bold text-emerald-600 text-xs uppercase mb-1">STATUS: LUNAS</p>
                <p>Simpan struk ini sebagai bukti pembayaran yang sah. Terima kasih.</p>
              </div>
            </div>

            {/* Tombol Aksi Cetak */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPelangganStruk(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrintWindow}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
                <span>Cetak Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* END: Struk Cetak Modal */}

      {/* BEGIN: PageFooter */}
      <footer className="bg-white border-t border-slate-200 py-4 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Aplikasi Quennet Billing Mobile Kolektor • Terhubung Online</span>
          </div>
          <div>© {tahunSekarang} Quennet Wi-Fi Sragen</div>
        </div>
      </footer>
      {/* END: PageFooter */}
    </div>
  );
}