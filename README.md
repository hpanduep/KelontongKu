# KelontongKu

Aplikasi kasir untuk toko kelontong & warung (React + TypeScript + Vite + Tailwind), dengan login dan penyimpanan data per user di Supabase.

## Setup Supabase

1. **Jalankan skema**: buka Supabase Dashboard -> SQL Editor, tempel isi `supabase/schema.sql`, klik Run.
   (Membuat tabel `products`, `transactions`, `kasbon`, `settings` + RLS: tiap user hanya bisa akses datanya sendiri.)
2. **Buat akun**: Authentication -> Users -> Add user (email + password). Pendaftaran publik tidak disediakan di aplikasi.
3. **Isi env**: salin `.env.example` menjadi `.env.local`, isi `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (Project Settings -> API).
4. `npm install` lalu `npm run dev`.

## Cara kerja data

- Login pertama kali: data lama di `localStorage` browser (kalau ada) otomatis dipindahkan ke akun tersebut, cadangannya
  disimpan di `localStorage['kelontong_backup_premigrasi']`. Kalau tidak ada data lama, dipakai data produk contoh.
- Setelah itu semua perubahan (produk, transaksi, kasbon, pengaturan) tersimpan otomatis ke Supabase.
  Badge di pojok kanan bawah menunjukkan status: Tersimpan / Menyimpan / Gagal sinkron (otomatis coba ulang tiap 15 detik).
- Deploy: `npm run deploy` (GitHub Pages). Env di-bake saat build di komputer lokal.

---

## Catatan template Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
