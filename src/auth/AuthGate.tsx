import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import LoginPage from './LoginPage';
import { AuthContext } from './AuthContext';
import { useSyncStatus, retrySync } from '../lib/sync';

function SyncBadge() {
  const { status } = useSyncStatus();
  const label =
    status === 'saving' ? '⏳ Menyimpan...' : status === 'error' ? '⚠️ Gagal sinkron' : '☁️ Tersimpan';
  return (
    <span className={status === 'error' ? 'text-red-600 font-semibold' : 'text-gray-500'}>
      {label}
      {status === 'error' && (
        <button onClick={retrySync} className="ml-1 underline font-semibold">
          Coba lagi
        </button>
      )}
    </span>
  );
}

interface AuthGateProps {
  children: ReactNode;
}

/**
 * Pembungkus login. Kalau belum login -> tampil LoginPage.
 * Kalau sudah login -> render children (App yang sudah ada) apa adanya.
 */
export default function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4 text-[#0B2545]">
        <div className="bg-white rounded-2xl shadow-lg border-t-8 border-[#C0392B] max-w-md w-full p-6">
          <h1 className="text-lg font-bold mb-2">Supabase belum dikonfigurasi</h1>
          <p className="text-sm text-gray-600">
            Buat file <code className="bg-gray-100 px-1 rounded">.env.local</code> berisi{' '}
            <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code> dan{' '}
            <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>, lalu restart dev server.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center text-sm text-gray-500">
        Memuat...
      </div>
    );
  }

  if (!session) return <LoginPage />;

  return (
    <AuthContext.Provider value={{ user: session.user }}>
      {children}

      {/* Info akun + tombol keluar (melayang, supaya App.tsx tidak perlu diubah) */}
      <div className="print:hidden fixed bottom-3 right-3 z-40 flex items-center space-x-2 bg-white/95 border border-gray-200 shadow-md rounded-full pl-3 pr-1.5 py-1.5 text-xs">
        <SyncBadge />
        <span className="text-gray-300">|</span>
        <span className="text-gray-500 max-w-[160px] truncate">{session.user.email}</span>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-3 py-1 bg-[#0B2545] hover:bg-[#133863] text-white rounded-full font-semibold transition"
        >
          Keluar
        </button>
      </div>
    </AuthContext.Provider>
  );
}
