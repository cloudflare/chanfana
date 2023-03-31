import bundleSize from 'rollup-plugin-bundle-size'
import { defineConfig } from 'rollup'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'

export default defineConfig({
  input: 'src/itty-router-openapi.ts',
  output: [
    { format: 'cjs', file: 'dist/itty-router-openapi.js' },
    { format: 'es', file: 'dist/itty-router-openapi.mjs' },
  ],
  plugins: [typescript(), terser(), bundleSize()],
  external: ['itty-router'],
})
