import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port de ton API : par défaut 8080. Pour un autre port (PowerShell) :
//   $env:VITE_API='http://localhost:8084'; npm run dev
const target = process.env.VITE_API || 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': target } }
});
