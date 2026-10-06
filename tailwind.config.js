/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kai: {
          offwhite: '#F4F5F7', // Putih gading hangat bodi lokomotif
          navy: '#0B2545',     // Biru tua klasik KAI
          blue: '#3A7CA5',     // Biru aksen cerah
          accent: '#C0392B',   // Merah bata ala cowcatcher (opsional tombol aksi)
        }
      }
    },
  },
  plugins: [],
}