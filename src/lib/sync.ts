import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { Settings } from '../types';
import {
  diffItems,
  hasChanges,
  pushDiff,
  pushSettings,
  type TableConfig,
} from './db';

/* ---------------- Status global (untuk badge "Tersimpan / Menyimpan / Gagal") ---------------- */

export interface SyncState {
  status: 'idle' | 'saving' | 'error';
  error: string;
}

let inFlight = 0;
const errors = new Map<string, string>();
let snapshot: SyncState = { status: 'idle', error: '' };
const listeners = new Set<() => void>();
const flushers = new Set<() => void>();

function recompute() {
  const status = errors.size > 0 ? 'error' : inFlight > 0 ? 'saving' : 'idle';
  snapshot = { status, error: [...errors.values()][0] ?? '' };
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useSyncStatus(): SyncState {
  return useSyncExternalStore(subscribe, () => snapshot);
}

export function retrySync() {
  flushers.forEach((f) => f());
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', retrySync);
  // Peringatkan kalau ada perubahan yang belum sempat tersimpan ke cloud.
  window.addEventListener('beforeunload', (e) => {
    if (snapshot.status !== 'idle') e.preventDefault();
  });
}

/* ---------------- Mesin sinkron generik ---------------- */

const RETRY_MS = 15000;

function useSyncEngine<T>(
  key: string,
  value: T,
  task: (v: T, begin: () => void) => Promise<void>
) {
  const valueRef = useRef(value);
  const taskRef = useRef(task);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const alive = useRef(true);
  const triggerRef = useRef<() => void>(() => {});

  useEffect(() => {
    taskRef.current = task;
  });

  const trigger = useCallback(() => {
    chain.current = chain.current.then(async () => {
      let started = false;
      const begin = () => {
        if (!started) {
          started = true;
          inFlight++;
          recompute();
        }
      };
      try {
        await taskRef.current(valueRef.current, begin);
        errors.delete(key);
      } catch (e) {
        const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Gagal menyimpan';
        errors.set(key, msg);
        console.error(`[sync:${key}]`, e);
        if (alive.current) setTimeout(() => alive.current && triggerRef.current(), RETRY_MS);
      } finally {
        if (started) inFlight--;
        recompute();
      }
    });
  }, [key]);

  useEffect(() => {
    triggerRef.current = trigger;
    alive.current = true;
    flushers.add(trigger);
    return () => {
      alive.current = false;
      flushers.delete(trigger);
      errors.delete(key);
      recompute();
    };
  }, [trigger, key]);

  useEffect(() => {
    valueRef.current = value;
    trigger();
  }, [value, trigger]);
}

/* ---------------- Hook yang dipakai App ---------------- */

/** Menyimpan perubahan array (tambah / ubah / hapus) ke tabel Supabase secara otomatis. */
export function useCloudCollection<T extends { id: string }>(
  cfg: TableConfig<T>,
  userId: string,
  items: T[],
  initial: T[]
) {
  const synced = useRef<Map<string, string> | null>(null);
  if (synced.current === null) {
    synced.current = new Map(initial.map((i) => [i.id, JSON.stringify(i)]));
  }

  useSyncEngine(cfg.table, items, async (current, begin) => {
    const map = synced.current!;
    const diff = diffItems(current, map);
    if (!hasChanges(diff)) return;
    begin();
    await pushDiff(cfg, userId, diff, map);
  });
}

/** Menyimpan pengaturan toko (1 baris per user). */
export function useCloudSettings(userId: string, settings: Settings, initial: Settings) {
  const synced = useRef<string>(JSON.stringify(initial));

  useSyncEngine('settings', settings, async (current, begin) => {
    const json = JSON.stringify(current);
    if (json === synced.current) return;
    begin();
    await pushSettings(userId, current);
    synced.current = json;
  });
}
