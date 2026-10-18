'use client';

import { useState, useEffect, useMemo, FormEvent } from 'react';
import * as XLSX from 'xlsx';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const DAFTAR_BULAN = [
  { no: 1, nama: 'Bulan 01 (Januari)', pendek: 'Jan' },
  { no: 2, nama: 'Bulan 02 (Februari)', pendek: 'Feb' },
  { no: 3, nama: 'Bulan 03 (Maret)', pendek: 'Mar' },
  { no: 4, nama: 'Bulan 04 (April)', pendek: 'Apr' },
  { no: 5, nama: 'Bulan 05 (Mei)', pendek: 'Mei' },
  { no: 6, nama: 'Bulan 06 (Juni)', pendek: 'Jun' },
  { no: 7, nama: 'Bulan 07 (Juli)', pendek: 'Jul' },
  { no: 8, nama: 'Bulan 08 (Agustus)', pendek: 'Agu' },
  { no: 9, nama: 'Bulan 09 (September)', pendek: 'Sep' },
  { no: 10, nama: 'Bulan 10 (Oktober)', pendek: 'Okt' },
  { no: 11, nama: 'Bulan 11 (November)', pendek: 'Nov' },
  { no: 12, nama: 'Bulan 12 (Desember)', pendek: 'Des' },
];

const AVATAR_COLORS = [
  'bg-blue-100 border-blue-200 text-blue-700',
  'bg-indigo-100 border-indigo-200 text-indigo-700',
  'bg-amber-100 border-amber-200 text-amber-700',
  'bg-purple-100 border-purple-200 text-purple-700',
  'bg-cyan-100 border-cyan-200 text-cyan-800',
  'bg-emerald-100 border-emerald-200 text-emerald-700',
  'bg-rose-100 border-rose-200 text-rose-700',
];

export default function PelangganPage() {
  const [pelangganList, setPelangganList] = useState<Pelanggan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalBuka, setModalBuka] = useState(false);
  const [sedangEditId, setSedangEditId] = useState<number | null>(null);
  const [simpanLoading, setSimpanLoading] = useState(false);

  // Filter Periode
  const [bulanPilihan, setBulanPilihan] = useState<number>(10);
  const [tahunPilihan, setTahunPilihan] = useState<number>(2026);
  const [isReady, setIsReady] = useState(false);

  // Filter Toolbar & Search
  const [kataKunci, setKataKunci] = useState('');
  const [filterWilayah, setFilterWilayah] = useState('SEMUA');
  const [filterStatus, setFilterStatus] = useState('SEMUA');

  // Pagination
  const [halamanAktif, setHalamanAktif] = useState(1);
  const perHalaman = 10;

  // Form Input
  const [formInput, setFormInput] = useState({
    nama: '',
    kecamatan: 'Sragen',
    desa: '',
    rt: '',
    tagihan: '150000',
    bulanMulai: 10,
    tahunMulai: 2026,
  });

  // 1. Inisialisasi tanggal lokal
  useEffect(() => {
    const sekarang = new Date();
    setBulanPilihan(sekarang.getMonth() + 1);
    setTahunPilihan(sekarang.getFullYear());
    setIsReady(true);
  }, []);

  // 2. Muat data pelanggan dari server
  const muatPelanggan = async () => {
    if (!bulanPilihan || !tahunPilihan) return;

    const token = localStorage.getItem('quennet_token');
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/pelanggan?bulan=${bulanPilihan}&tahun=${tahunPilihan}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();
      setPelangganList(json.data || []);
      setHalamanAktif(1);
    } catch (err) {
      console.error('Gagal mengambil data pelanggan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady) {
      muatPelanggan();
    }
  }, [isReady, bulanPilihan, tahunPilihan]);

  // Hitungan Ringkas
  const totalLunas = pelangganList.filter((p) => p.isLunas).length;
  const totalBelumLunas = pelangganList.filter((p) => !p.isLunas).length;

  // Opsi Wilayah Unik (Desa — RT {rt})
  const daftarWilayah = useMemo(() => {
    const map = new Map<string, { desa: string; rt: string; kecamatan: string }>();
    pelangganList.forEach((p) => {
      const key = `${p.desa} — RT ${p.rt}`;
      if (!map.has(key)) {
        map.set(key, { desa: p.desa, rt: p.rt, kecamatan: p.kecamatan });
      }
    });
    return Array.from(map.entries());
  }, [pelangganList]);

  // Pelanggan Terfilter
  const pelangganTerfilter = useMemo(() => {
    return pelangganList.filter((p) => {
      const q = kataKunci.toLowerCase().trim();
      const matchKunci =
        !q ||
        p.nama.toLowerCase().includes(q) ||
        p.desa.toLowerCase().includes(q) ||
        p.rt.toLowerCase().includes(q) ||
        p.kecamatan.toLowerCase().includes(q);

      const wilayahKey = `${p.desa} — RT ${p.rt}`;
      const matchWilayah = filterWilayah === 'SEMUA' || wilayahKey === filterWilayah;

      const matchStatus =
        filterStatus === 'SEMUA' ||
        (filterStatus === 'LUNAS' && p.isLunas) ||
        (filterStatus === 'BELUM' && !p.isLunas);

      return matchKunci && matchWilayah && matchStatus;
    });
  }, [pelangganList, kataKunci, filterWilayah, filterStatus]);

  // Data Paginated
  const totalHalaman = Math.max(1, Math.ceil(pelangganTerfilter.length / perHalaman));
  const indeksAwal = (halamanAktif - 1) * perHalaman;
  const dataTampil = pelangganTerfilter.slice(indeksAwal, indeksAwal + perHalaman);

  // Buka Modal Tambah
  const handleBukaTambah = () => {
    setSedangEditId(null);
    setFormInput({
      nama: '',
      kecamatan: 'Sragen',
      desa: '',
      rt: '',
      tagihan: '150000',
      bulanMulai: bulanPilihan || 10,
      tahunMulai: tahunPilihan || 2026,
    });
    setModalBuka(true);
  };

  // Buka Modal Edit
  const handleBukaEdit = (p: Pelanggan) => {
    setSedangEditId(p.id);
    setFormInput({
      nama: p.nama,
      kecamatan: p.kecamatan,
      desa: p.desa,
      rt: p.rt,
      tagihan: p.tagihan.toString(),
      bulanMulai: p.bulanMulai || bulanPilihan || 10,
      tahunMulai: p.tahunMulai || tahunPilihan || 2026,
    });
    setModalBuka(true);
  };

  // Submit Simpan (POST / PUT)
  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault();
    setSimpanLoading(true);

    const token = localStorage.getItem('quennet_token');
    const isEdit = sedangEditId !== null;
    const url = isEdit ? `${API_BASE_URL}/pelanggan/${sedangEditId}` : `${API_BASE_URL}/pelanggan`;
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formInput,
          tagihan: Number(formInput.tagihan),
          bulanMulai: Number(formInput.bulanMulai),
          tahunMulai: Number(formInput.tahunMulai),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.pesan || 'Gagal menyimpan');

      setModalBuka(false);
      muatPelanggan();
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan saat menyimpan');
    } finally {
      setSimpanLoading(false);
    }
  };

  // Hapus Pelanggan
  const handleHapus = async (p: Pelanggan) => {
    if (!confirm(`Hapus permanen ${p.nama}? Semua riwayat pembayarannya akan ikut terhapus.`)) return;

    const token = localStorage.getItem('quennet_token');
    try {
      const res = await fetch(`${API_BASE_URL}/pelanggan/${p.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        muatPelanggan();
      } else {
        alert('Gagal menghapus data pelanggan');
      }
    } catch {
      alert('Terjadi kesalahan jaringan');
    }
  };

  // Ekspor Excel
  const handleEksporExcel = () => {
    if (pelangganTerfilter.length === 0) {
      alert('Tidak ada data yang dapat diekspor!');
      return;
    }

    const dataExcel = pelangganTerfilter.map((p, idx) => ({
      No: idx + 1,
      'Kode Pelanggan': `QN-${tahunPilihan}${String(p.id).padStart(4, '0')}`,
      'Nama Warga': p.nama,
      Desa: p.desa,
      RT: p.rt,
      Kecamatan: p.kecamatan,
      'Tarif Tagihan (Rp)': p.tagihan,
      'Status Pembayaran': p.isLunas ? 'LUNAS' : 'BELUM BAYAR',
      'Metode/Penagih': p.detailPembayaran?.penagih || (p.isLunas ? 'Kolektor RT' : '-'),
      'Tanggal Bayar': p.detailPembayaran?.tanggalBayar
        ? new Date(p.detailPembayaran.tanggalBayar).toLocaleDateString('id-ID')
        : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Pelanggan_${bulanPilihan}_${tahunPilihan}`);
    XLSX.writeFile(wb, `Data_Pelanggan_Quennet_Bulan_${bulanPilihan}_${tahunPilihan}.xlsx`);
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

  const bulanObj = DAFTAR_BULAN.find((b) => b.no === bulanPilihan);
  const namaBulanPendek = bulanObj ? bulanObj.pendek : 'Bulan';

  return (
    <div className="flex-1 flex flex-col">
      {/* BEGIN: Hero Header Section with Curved Wave (Tanpa 4 Kartu Statistik) */}
      <div className="bg-dataseal-hero text-white relative pb-20 pt-8">
        {/* Decorative top glow spot */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* BEGIN: Hero Content Header */}
        <section className="max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30">
                  Admin Portal
                </span>
                <span className="text-xs text-blue-100 font-medium">
                  {pelangganList.length} Warga Terdaftar Aktif
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                Kelola Pelanggan
              </h2>
              <p className="mt-1.5 text-sm text-blue-100 max-w-2xl font-medium">
                Tambah data warga, perbaiki alamat/tarif, atur status tagihan berkala, atau hapus langganan warga dengan cepat dan terorganisir.
              </p>
            </div>

            {/* Period Filter & Action CTA (Bulan, Tahun, Tambah Pelanggan) */}
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
                  title="Ubah tahun tagihan"
                />
              </div>

              {/* Add Customer Primary Button (Amber/Gold Style CTA) */}
              <button
                onClick={handleBukaTambah}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg glow-amber-btn active:scale-95 cursor-pointer"
              >
                <i className="fa-solid fa-plus text-sm text-slate-900"></i>
                <span>Tambah Pelanggan</span>
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
      <main className="flex-1 max-w-[1480px] w-full mx-auto px-4 sm:px-6 lg:px-8 -mt-8 sm:-mt-10 pb-12 space-y-6 relative z-10">
        {/* BEGIN: FilterAndSearchToolbar (Cari, Wilayah, Status, Ekspor Excel) */}
        <section className="bg-white border border-[#E2ECF8] p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 shadow-dataseal">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-500">
              <i className="fa-solid fa-magnifying-glass text-sm"></i>
            </div>
            <input
              type="text"
              value={kataKunci}
              onChange={(e) => {
                setKataKunci(e.target.value);
                setHalamanAktif(1);
              }}
              placeholder="Cari nama warga, RT, atau alamat..."
              className="w-full pl-10 pr-4 py-2 bg-[#F8FAFD] border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          {/* Filter Dropdowns & Export Group */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Wilayah/RT */}
            <div className="relative">
              <select
                value={filterWilayah}
                onChange={(e) => {
                  setFilterWilayah(e.target.value);
                  setHalamanAktif(1);
                }}
                className="appearance-none bg-[#F8FAFD] border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-xl pl-3 pr-8 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer"
              >
                <option value="SEMUA">Semua Wilayah RT</option>
                {daftarWilayah.map(([wilayah, val]) => (
                  <option key={wilayah} value={wilayah}>
                    {wilayah} ({val.kecamatan})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <i className="fa-solid fa-chevron-down text-xs"></i>
              </div>
            </div>

            {/* Filter Status Bayar */}
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setHalamanAktif(1);
                }}
                className="appearance-none bg-[#F8FAFD] border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-xl pl-3 pr-8 py-2 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 cursor-pointer"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="LUNAS">Lunas ({totalLunas})</option>
                <option value="BELUM">Belum Lunas ({totalBelumLunas})</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <i className="fa-solid fa-chevron-down text-xs"></i>
              </div>
            </div>

            {/* Download Report CTA */}
            <button
              onClick={handleEksporExcel}
              className="inline-flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer"
              title="Unduh data pelanggan dalam format Excel"
            >
              <i className="fa-solid fa-file-arrow-down text-xs text-emerald-600"></i>
              <span>Ekspor Excel</span>
            </button>
          </div>
        </section>
        {/* END: FilterAndSearchToolbar */}

        {/* BEGIN: CustomerDataTableContainer */}
        <div className="bg-white border border-[#E2ECF8] rounded-2xl overflow-hidden shadow-dataseal">
          <div className="overflow-x-auto">
            {/* NOTE: Font Roboto applied strictly to the table per user requirement */}
            <table
              className="w-full text-left border-collapse font-roboto"
              id="customers-table"
              style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}
            >
              {/* Table Headings */}
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-[#F8FAFD]">
                  <th className="py-4 px-6" scope="col">Nama Warga</th>
                  <th className="py-4 px-6" scope="col">Alamat Wilayah</th>
                  <th className="py-4 px-6" scope="col">Tarif Paket</th>
                  <th className="py-4 px-6 text-center" scope="col">
                    Status Bulan {bulanPilihan}/{tahunPilihan}
                  </th>
                  <th className="py-4 px-6" scope="col">Metode &amp; Waktu</th>
                  <th className="py-4 px-6 text-right" scope="col">Aksi</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <i className="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600"></i>
                        <span className="text-xs font-semibold">Memuat data pelanggan periode {bulanPilihan}/{tahunPilihan}...</span>
                      </div>
                    </td>
                  </tr>
                ) : dataTampil.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <i className="fa-regular fa-folder-open text-3xl text-slate-300"></i>
                        <p className="text-sm font-bold text-slate-600">Tidak ada data pelanggan ditemukan</p>
                        <p className="text-xs text-slate-400">Coba ubah kata kunci pencarian atau filter wilayah/status.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  dataTampil.map((p) => {
                    const { inisial, warnaClass } = getAvatar(p.nama, p.id);
                    const kodePelanggan = `QN-${tahunPilihan}${String(p.id).padStart(4, '0')}`;
                    const paketDesc = p.tagihan <= 150000 ? '20 Mbps Home Fiber' : '35 Mbps Pro Gamer';

                    // Pesan WhatsApp otomatis
                    const pesanWa = p.isLunas
                      ? `Halo Bpk/Ibu ${p.nama}, terima kasih pembayaran tagihan Wi-Fi Quennet bulan ${bulanPilihan}/${tahunPilihan} sebesar Rp ${p.tagihan.toLocaleString('id-ID')} telah LUNAS.`
                      : `Halo Bpk/Ibu ${p.nama}, mengingatkan tagihan Wi-Fi Quennet bulan ${bulanPilihan}/${tahunPilihan} sebesar Rp ${p.tagihan.toLocaleString('id-ID')} belum terbayar. Jatuh tempo tgl 20 ${namaBulanPendek}. Terima kasih.`;

                    return (
                      <tr key={p.id} className="hover:bg-blue-50/40 transition-colors group">
                        {/* 1. Nama Warga */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold text-xs uppercase shadow-sm ${warnaClass}`}
                            >
                              {inisial}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors block">
                                {p.nama}
                              </span>
                              <p className="text-xs text-slate-400 font-mono">
                                {kodePelanggan}
                                {p.nomorHp ? ` • ${p.nomorHp}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Alamat Wilayah */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <i className="fa-solid fa-location-dot text-blue-500 text-xs"></i>
                            <span>
                              {p.desa} — RT {p.rt}{' '}
                              <span className="text-slate-400 text-xs font-normal">({p.kecamatan})</span>
                            </span>
                          </div>
                        </td>

                        {/* 3. Tarif Paket */}
                        <td className="py-4 px-6">
                          <span className="font-extrabold text-blue-600 font-mono tracking-tight text-base block">
                            Rp {p.tagihan.toLocaleString('id-ID')}
                          </span>
                          <span className="block text-[11px] text-slate-400">{paketDesc}</span>
                        </td>

                        {/* 4. Status Bulan */}
                        <td className="py-4 px-6 text-center">
                          {p.isLunas ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                              <i className="fa-solid fa-circle-check text-[11px] text-emerald-600"></i> LUNAS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                              <i className="fa-regular fa-clock text-[11px] text-amber-600"></i> BELUM BAYAR
                            </span>
                          )}
                        </td>

                        {/* 5. Metode & Waktu */}
                        <td className="py-4 px-6">
                          {p.isLunas ? (
                            <div className="text-xs">
                              <span className="text-slate-700 font-semibold block">
                                {p.detailPembayaran?.penagih
                                  ? `Kolektor: ${p.detailPembayaran.penagih}`
                                  : 'Cash (Kolektor RT)'}
                              </span>
                              <span className="block text-slate-400 text-[11px]">
                                {p.detailPembayaran?.tanggalBayar
                                  ? new Date(p.detailPembayaran.tanggalBayar).toLocaleDateString('id-ID', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })
                                  : 'Tercatat lunas'}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs">
                              <span className="text-amber-700 font-semibold block">
                                Jatuh Tempo: 20 {namaBulanPendek}
                              </span>
                              <span className="block text-slate-400 text-[11px]">Tagihan terkirim</span>
                            </div>
                          )}
                        </td>

                        {/* 6. Aksi */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* WhatsApp Button */}
                            {!p.isLunas ? (
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(pesanWa)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm transition"
                                title="Kirim Pengingat WhatsApp"
                              >
                                <i className="fa-brands fa-whatsapp text-xs"></i> Ingatkan
                              </a>
                            ) : (
                              <a
                                href={`https://wa.me/?text=${encodeURIComponent(pesanWa)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition"
                                title="Kirim Nota WA"
                              >
                                <i className="fa-brands fa-whatsapp text-base"></i>
                              </a>
                            )}

                            {/* Edit Button */}
                            <button
                              onClick={() => handleBukaEdit(p)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition cursor-pointer"
                            >
                              Edit
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleHapus(p)}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* BEGIN: TablePagination */}
          <div
            className="px-4 sm:px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#F8FAFD] font-roboto"
            style={{ fontFamily: "'Roboto', system-ui, sans-serif" }}
          >
            <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
              Menampilkan <span className="font-bold text-slate-800">{pelangganTerfilter.length === 0 ? 0 : indeksAwal + 1}</span> sampai{' '}
              <span className="font-bold text-slate-800">{Math.min(indeksAwal + perHalaman, pelangganTerfilter.length)}</span> dari{' '}
              <span className="font-bold text-slate-800">{pelangganTerfilter.length}</span> pelanggan aktif
            </p>

            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                onClick={() => setHalamanAktif((h) => Math.max(1, h - 1))}
                disabled={halamanAktif === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-white border border-slate-200 disabled:text-slate-300 disabled:cursor-not-allowed hover:border-blue-300 shadow-sm transition cursor-pointer"
              >
                <i className="fa-solid fa-chevron-left mr-1"></i> Sebelumnya
              </button>

              {Array.from({ length: totalHalaman }, (_, i) => i + 1)
                .slice(Math.max(0, halamanAktif - 3), Math.min(totalHalaman, halamanAktif + 2))
                .map((noHalaman) => (
                  <button
                    key={noHalaman}
                    onClick={() => setHalamanAktif(noHalaman)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                      halamanAktif === noHalaman
                        ? 'bg-blue-600 text-white shadow-pill'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    {noHalaman}
                  </button>
                ))}

              <button
                onClick={() => setHalamanAktif((h) => Math.min(totalHalaman, h + 1))}
                disabled={halamanAktif === totalHalaman || totalHalaman === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-blue-600 bg-white border border-slate-200 disabled:text-slate-300 disabled:cursor-not-allowed hover:border-blue-200 shadow-sm transition cursor-pointer"
              >
                Berikutnya <i className="fa-solid fa-chevron-right ml-1"></i>
              </button>
            </div>
          </div>
          {/* END: TablePagination */}
        </div>
        {/* END: CustomerDataTableContainer */}
      </main>
      {/* END: MainContent */}

      {/* BEGIN: Modal Tambah / Edit Pelanggan */}
      {modalBuka && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white border border-[#E2ECF8] w-full max-w-lg rounded-3xl p-5 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base font-bold shadow-sm">
                  <i className={`fa-solid ${sedangEditId ? 'fa-user-pen' : 'fa-user-plus'}`}></i>
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {sedangEditId ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pastikan nama dan wilayah RT diisi dengan benar untuk data tagihan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalBuka(false)}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition"
                title="Tutup dialog"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nama Warga
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pak Supri / Bu Siti Rahmah"
                  value={formInput.nama}
                  onChange={(e) => setFormInput({ ...formInput, nama: e.target.value })}
                  className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Desa / Wilayah
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sragen Wetan"
                    value={formInput.desa}
                    onChange={(e) => setFormInput({ ...formInput, desa: e.target.value })}
                    className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    RT / RW
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 01"
                    value={formInput.rt}
                    onChange={(e) => setFormInput({ ...formInput, rt: e.target.value })}
                    className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Kecamatan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Sragen"
                  value={formInput.kecamatan}
                  onChange={(e) => setFormInput({ ...formInput, kecamatan: e.target.value })}
                  className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tarif Tagihan Bulanan (Rp)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 text-xs font-bold">
                    Rp
                  </span>
                  <input
                    type="number"
                    required
                    step="5000"
                    placeholder="150000"
                    value={formInput.tagihan}
                    onChange={(e) => setFormInput({ ...formInput, tagihan: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFD] border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Mulai Bulan
                  </label>
                  <select
                    value={formInput.bulanMulai}
                    onChange={(e) => setFormInput({ ...formInput, bulanMulai: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
                  >
                    {DAFTAR_BULAN.map((b) => (
                      <option key={b.no} value={b.no}>
                        {b.nama}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Mulai Tahun
                  </label>
                  <input
                    type="number"
                    value={formInput.tahunMulai}
                    onChange={(e) => setFormInput({ ...formInput, tahunMulai: Number(e.target.value) })}
                    className="w-full bg-[#F8FAFD] border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 font-mono focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 mt-5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalBuka(false)}
                  className="px-4 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={simpanLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-lg glow-btn active:scale-95 transition cursor-pointer"
                >
                  {simpanLoading ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin text-xs"></i>
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check text-xs"></i>
                      <span>{sedangEditId ? 'Simpan Perubahan' : 'Tambah Pelanggan'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* END: Modal Tambah / Edit */}
    </div>
  );
}