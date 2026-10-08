import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from './supabase';
import { loadAll, type CloudData as CloudDataT } from './db';

interface Props {
  children: (data: CloudDataT, userId: string) => ReactNode;
}

/** Memuat data milik user dari Supabase sebelum App ditampilkan. */
export default function CloudData({ children }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<CloudDataT | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    loadAll(user.id)
      .then((d) => !cancelled && setData(d))
      .catch((e) => {
        if (cancelled) return;
        console.error(e);
        setError(e?.message ?? 'Gagal memuat data');
      });
    return () => {
      cancelled = true;
    };
  }, [user.id, attempt]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4 text-[#0B2545]">
        <div className="bg-white rounded-2xl shadow-lg border-t-8 border-[#C0392B] max-w-md w-full p-6 space-y-3">
          <h1 className="text-lg font-bold">Gagal memuat data toko</h1>
          <p className="text-sm text-gray-600 break-words">{error}</p>
          <p className="text-xs text-gray-400">
            Pastikan <code className="bg-gray-100 px-1 rounded">supabase/schema.sql</code> sudah dijalankan di
            SQL Editor Supabase dan koneksi internet aktif.
          </p>
          <div className="flex space-x-2 pt-2">
            <button
              onClick={() => {
                setError('');
                setAttempt((n) => n + 1);
              }}
              className="flex-1 py-2.5 bg-[#0B2545] hover:bg-[#133863] text-white rounded-lg text-sm font-semibold"
            >
              Coba Lagi
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center text-sm text-gray-500">
        Memuat data toko...
      </div>
    );
  }

  return <>{children(data, user.id)}</>;
}
