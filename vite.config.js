import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: caminho do repositório no GitHub Pages. Ajuste se o nome do repo mudar.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/estante/',
})
