// lib/cache.ts
// Utility caching client-side untuk mempercepat fetching data besar dan mendukung refresh data

interface CacheEntry<T> {
  data: T;
  timestamp: number; // epoch ms
  expiresAt: number; // epoch ms
}

// In-memory cache fallback untuk kecepatan maksimal selama sesi browser aktif
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Default TTL: 10 menit
const DEFAULT_TTL_MS = 10 * 60 * 1000;

/**
 * Mengambil data dari cache (cek memoryCache dahulu, lalu localStorage).
 * Mengembalikan data dan timestamp waktu penyimpanan, atau null jika tidak ada/kadaluwarsa.
 */
export function ambilCache<T>(key: string): { data: T; timestamp: number; isStale: boolean } | null {
  const sekarang = Date.now();

  // 1. Cek In-memory cache
  if (memoryCache.has(key)) {
    const item = memoryCache.get(key) as CacheEntry<T>;
    if (item) {
      const isExpired = sekarang > item.expiresAt;
      return {
        data: item.data,
        timestamp: item.timestamp,
        isStale: isExpired,
      };
    }
  }

  // 2. Cek localStorage (jika di browser)
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(`quinnet_cache_${key}`);
    if (!raw) return null;

    const parsed: CacheEntry<T> = JSON.parse(raw);
    const isExpired = sekarang > parsed.expiresAt;

    // Sinkronkan ke memory cache
    memoryCache.set(key, parsed);

    return {
      data: parsed.data,
      timestamp: parsed.timestamp,
      isStale: isExpired,
    };
  } catch (err) {
    console.warn('Gagal membaca cache:', err);
    return null;
  }
}

/**
 * Menyimpan data ke dalam memoryCache dan localStorage.
 */
export function simpanCache<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): void {
  const sekarang = Date.now();
  const entry: CacheEntry<T> = {
    data,
    timestamp: sekarang,
    expiresAt: sekarang + ttlMs,
  };

  // 1. Simpan di memoryCache
  memoryCache.set(key, entry);

  // 2. Simpan di localStorage
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(`quinnet_cache_${key}`, JSON.stringify(entry));
  } catch (err) {
    // Tangani jika kuota localStorage penuh
    console.warn('Kuota localStorage penuh atau error saat simpan cache:', err);
    try {
      // Bersihkan cache lama jika kuota penuh
      bersihkanSemuaCache('quinnet_cache_');
      localStorage.setItem(`quinnet_cache_${key}`, JSON.stringify(entry));
    } catch {
      // Abaikan jika tetap gagal, data tetap aman di memoryCache
    }
  }
}

/**
 * Menghapus cache berdasarkan key tertentu atau prefix key
 * Contoh: hapusCache('pelanggan') akan menghapus semua cache yang berawalan 'pelanggan'
 */
export function hapusCache(prefixKey?: string): void {
  // Hapus dari memoryCache
  if (!prefixKey) {
    memoryCache.clear();
  } else {
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefixKey)) {
        memoryCache.delete(key);
      }
    }
  }

  // Hapus dari localStorage
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];
    const searchPrefix = prefixKey ? `quinnet_cache_${prefixKey}` : 'quinnet_cache_';

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(searchPrefix)) {
        keysToRemove.push(k);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn('Gagal menghapus cache localStorage:', err);
  }
}

/**
 * Membersihkan semua cache Quinnet
 */
export function bersihkanSemuaCache(prefix = 'quinnet_cache_'): void {
  hapusCache(prefix.replace('quinnet_cache_', ''));
}

/**
 * Format timestamp menjadi teks human-readable
 * Contoh: "13:45:02" atau "Baru saja"
 */
export function formatWaktuCache(timestampMs: number | null): string {
  if (!timestampMs) return '';
  const selisihDetik = Math.floor((Date.now() - timestampMs) / 1000);

  if (selisihDetik < 10) return 'Baru saja';
  if (selisihDetik < 60) return `${selisihDetik} dtk lalu`;
  if (selisihDetik < 3600) return `${Math.floor(selisihDetik / 60)} mnt lalu`;

  const d = new Date(timestampMs);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
