import { supabase } from './supabase';
import type { CartItem, KasbonItem, Product, Settings, Transaction } from '../types';

type Row = Record<string, unknown>;

export interface CloudData {
  products: Product[];
  transactions: Transaction[];
  kasbon: KasbonItem[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  storeName: '',
  tokoPrefix: 'TOKO',
  warungPrefix: 'DAPOER',
  printerWidth: '58mm',
};

export const DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: 'Beras Ramos 5kg', price: 65000, stock: 15, category: 'kelontong', barcode: '899123456701' },
  { id: '2', name: 'Minyak Goreng Bimoli 1L', price: 19000, stock: 30, category: 'kelontong', barcode: '899123456702' },
  { id: '3', name: 'Gula Pasir 1kg', price: 17500, stock: 25, category: 'kelontong', barcode: '899123456703' },
  { id: '4', name: 'Sabun Mandi Lifebuoy', price: 4500, stock: 40, category: 'kelontong', barcode: '899123456704' },
  { id: '5', name: 'Es Teh Manis Jumbo', price: 5000, stock: 100, category: 'warung' },
  { id: '6', name: 'Kopi Hitam Tubruk', price: 4000, stock: 80, category: 'warung' },
  { id: '7', name: 'Indomie Telor Rebus', price: 12000, stock: 45, category: 'warung' },
  { id: '8', name: 'Gorengan Bakwan/Tempe', price: 2000, stock: 60, category: 'warung' },
];

/* ------------------------------------------------------------------ */
/* Pemetaan objek aplikasi <-> baris tabel                              */
/* ------------------------------------------------------------------ */

export interface TableConfig<T extends { id: string }> {
  table: string;
  toRow: (item: T) => Row;
  fromRow: (row: Row) => T;
}

export const productsTable: TableConfig<Product> = {
  table: 'products',
  toRow: (p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    stock: p.stock,
    category: p.category,
    barcode: p.barcode ?? null,
    image: p.image ?? null,
  }),
  fromRow: (r) => {
    const p: Product = {
      id: String(r.id),
      name: String(r.name),
      price: Number(r.price),
      stock: Number(r.stock),
      category: r.category as Product['category'],
    };
    if (r.barcode) p.barcode = String(r.barcode);
    if (r.image) p.image = String(r.image);
    return p;
  },
};

export const transactionsTable: TableConfig<Transaction> = {
  table: 'transactions',
  toRow: (t) => ({
    id: t.id,
    date: t.date,
    formatted_date: t.formattedDate,
    items: t.items,
    subtotal: t.subtotal,
    discount: t.discount,
    final_payment: t.finalPayment,
    cash_given: t.cashGiven,
    change_amount: t.change,
    is_kasbon: t.isKasbon,
    customer_name: t.customerName ?? null,
    profile: t.profile,
  }),
  fromRow: (r) => {
    const t: Transaction = {
      id: String(r.id),
      date: new Date(String(r.date)).toISOString(),
      formattedDate: String(r.formatted_date),
      items: (r.items as CartItem[]) ?? [],
      subtotal: Number(r.subtotal),
      discount: Number(r.discount),
      finalPayment: Number(r.final_payment),
      cashGiven: Number(r.cash_given),
      change: Number(r.change_amount),
      isKasbon: Boolean(r.is_kasbon),
      profile: r.profile as Transaction['profile'],
    };
    if (r.customer_name) t.customerName = String(r.customer_name);
    return t;
  },
};

export const kasbonTable: TableConfig<KasbonItem> = {
  table: 'kasbon',
  toRow: (k) => ({
    id: k.id,
    trx_id: k.trxId,
    customer_name: k.customerName,
    date: k.date,
    amount: k.amount,
    is_paid: k.isPaid,
    items_summary: k.itemsSummary,
  }),
  fromRow: (r) => ({
    id: String(r.id),
    trxId: String(r.trx_id),
    customerName: String(r.customer_name),
    date: String(r.date),
    amount: Number(r.amount),
    isPaid: Boolean(r.is_paid),
    itemsSummary: String(r.items_summary ?? ''),
  }),
};

const settingsToRow = (s: Settings): Row => ({
  store_name: s.storeName,
  toko_prefix: s.tokoPrefix,
  warung_prefix: s.warungPrefix,
  printer_width: s.printerWidth,
});

const settingsFromRow = (r: Row): Settings => ({
  storeName: String(r.store_name ?? ''),
  tokoPrefix: String(r.toko_prefix ?? DEFAULT_SETTINGS.tokoPrefix),
  warungPrefix: String(r.warung_prefix ?? DEFAULT_SETTINGS.warungPrefix),
  printerWidth: String(r.printer_width ?? DEFAULT_SETTINGS.printerWidth),
});

/* ------------------------------------------------------------------ */
/* Diff (murni, tanpa jaringan)                                         */
/* ------------------------------------------------------------------ */

export interface Diff<T> {
  added: { item: T; json: string }[];
  changed: { item: T; json: string }[];
  removed: string[];
}

export function diffItems<T extends { id: string }>(items: T[], synced: Map<string, string>): Diff<T> {
  const added: Diff<T>['added'] = [];
  const changed: Diff<T>['changed'] = [];
  const seen = new Set<string>();

  for (const item of items) {
    seen.add(item.id);
    const json = JSON.stringify(item);
    const prev = synced.get(item.id);
    if (prev === undefined) added.push({ item, json });
    else if (prev !== json) changed.push({ item, json });
  }

  const removed = [...synced.keys()].filter((id) => !seen.has(id));
  return { added, changed, removed };
}

export const hasChanges = <T>(d: Diff<T>) => d.added.length + d.changed.length + d.removed.length > 0;

/* ------------------------------------------------------------------ */
/* Tulis ke Supabase                                                    */
/* ------------------------------------------------------------------ */

const CHUNK = 20; // kecil karena foto produk disimpan sebagai data-URL

function chunks<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function pushDiff<T extends { id: string }>(
  cfg: TableConfig<T>,
  userId: string,
  diff: Diff<T>,
  synced: Map<string, string>
) {
  // Item baru: sertakan sort_key (urutan tampil; item paling depan = paling baru).
  const base = Date.now();
  for (const batch of chunks(diff.added)) {
    const rows = batch.map(({ item }) => {
      const idx = diff.added.findIndex((a) => a.item.id === item.id);
      return { ...cfg.toRow(item), user_id: userId, sort_key: base - idx };
    });
    const { error } = await supabase.from(cfg.table).upsert(rows, { onConflict: 'user_id,id' });
    if (error) throw error;
    batch.forEach(({ item, json }) => synced.set(item.id, json));
  }

  // Item berubah: jangan sentuh sort_key.
  for (const batch of chunks(diff.changed)) {
    const rows = batch.map(({ item }) => ({ ...cfg.toRow(item), user_id: userId }));
    const { error } = await supabase.from(cfg.table).upsert(rows, { onConflict: 'user_id,id' });
    if (error) throw error;
    batch.forEach(({ item, json }) => synced.set(item.id, json));
  }

  for (const ids of chunks(diff.removed, 100)) {
    const { error } = await supabase.from(cfg.table).delete().eq('user_id', userId).in('id', ids);
    if (error) throw error;
    ids.forEach((id) => synced.delete(id));
  }
}

export async function pushSettings(userId: string, s: Settings) {
  const { error } = await supabase
    .from('settings')
    .upsert({ ...settingsToRow(s), user_id: userId }, { onConflict: 'user_id' });
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* Baca dari Supabase + migrasi pertama kali                            */
/* ------------------------------------------------------------------ */

async function fetchAll<T extends { id: string }>(cfg: TableConfig<T>, userId: string): Promise<T[]> {
  const size = 1000; // batas default PostgREST
  const out: T[] = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await supabase
      .from(cfg.table)
      .select('*')
      .eq('user_id', userId)
      .order('sort_key', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + size - 1);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    out.push(...rows.map(cfg.fromRow));
    if (rows.length < size) break;
  }
  return out;
}

async function uploadAll<T extends { id: string }>(cfg: TableConfig<T>, userId: string, items: T[]) {
  const base = Date.now();
  const indexed = items.map((item, i) => ({ item, sort: base - i }));
  for (const batch of chunks(indexed)) {
    const rows = batch.map(({ item, sort }) => ({ ...cfg.toRow(item), user_id: userId, sort_key: sort }));
    const { error } = await supabase.from(cfg.table).upsert(rows, { onConflict: 'user_id,id' });
    if (error) throw error;
  }
}

const LEGACY_KEYS = [
  'kelontong_products',
  'kelontong_transactions',
  'kelontong_kasbon',
  'kelontong_settings',
] as const;

function readLegacy<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

// Mencegah dua pemanggilan bersamaan (mis. StrictMode) berebut migrasi.
const inflight = new Map<string, Promise<CloudData>>();

export function loadAll(userId: string): Promise<CloudData> {
  const existing = inflight.get(userId);
  if (existing) return existing;
  const p = doLoadAll(userId).finally(() => inflight.delete(userId));
  inflight.set(userId, p);
  return p;
}

async function doLoadAll(userId: string): Promise<CloudData> {
  const { data: settingsRow, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;

  // Sudah pernah diinisialisasi -> baca dari cloud apa adanya.
  if (settingsRow) {
    const [products, transactions, kasbon] = await Promise.all([
      fetchAll(productsTable, userId),
      fetchAll(transactionsTable, userId),
      fetchAll(kasbonTable, userId),
    ]);
    return { products, transactions, kasbon, settings: settingsFromRow(settingsRow as Row) };
  }

  // Login pertama kali: pindahkan data localStorage lama (kalau ada), atau pakai data awal.
  const data: CloudData = {
    products: readLegacy<Product[]>('kelontong_products') ?? DEFAULT_PRODUCTS,
    transactions: readLegacy<Transaction[]>('kelontong_transactions') ?? [],
    kasbon: readLegacy<KasbonItem[]>('kelontong_kasbon') ?? [],
    settings: { ...DEFAULT_SETTINGS, ...(readLegacy<Partial<Settings>>('kelontong_settings') ?? {}) },
  };

  await uploadAll(productsTable, userId, data.products);
  await uploadAll(transactionsTable, userId, data.transactions);
  await uploadAll(kasbonTable, userId, data.kasbon);
  await pushSettings(userId, data.settings); // terakhir = penanda "migrasi selesai"

  // Simpan cadangan satu kali lalu bersihkan kunci lama, supaya akun lain di browser
  // yang sama tidak ikut "mewarisi" data ini.
  try {
    const backup: Record<string, string | null> = {};
    LEGACY_KEYS.forEach((k) => (backup[k] = localStorage.getItem(k)));
    if (Object.values(backup).some(Boolean)) {
      localStorage.setItem('kelontong_backup_premigrasi', JSON.stringify(backup));
    }
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* abaikan */
  }

  return data;
}
