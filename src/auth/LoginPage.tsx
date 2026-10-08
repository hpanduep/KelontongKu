import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErrorMsg(
        error.message === 'Invalid login credentials'
          ? 'Email atau password salah.'
          : error.message
      );
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4 font-sans text-[#0B2545]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-[#3A7CA5] rounded-xl flex items-center justify-center text-3xl shadow-inner border border-white/25">
            🛒
          </div>
          <h1 className="text-2xl font-bold tracking-wide mt-3">KelontongKu</h1>
          <p className="text-xs text-gray-400 mt-1">Masuk untuk membuka kasir</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl shadow-lg border-t-8 border-[#0B2545] p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-semibold mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              autoComplete="email"
              autoFocus
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#3A7CA5]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full px-3 py-2.5 pr-16 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#3A7CA5]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#3A7CA5] hover:underline"
              >
                {showPassword ? 'Sembunyi' : 'Lihat'}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5 font-medium">
              ⚠️ {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`w-full py-3 rounded-xl font-bold text-sm text-white transition shadow ${
              submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#0B2545] hover:bg-[#133863]'
            }`}
          >
            {submitting ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p className="text-center text-[11px] text-gray-400 mt-4">KelontongKu • Akses khusus pemilik</p>
      </div>
    </div>
  );
}
