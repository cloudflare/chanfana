import bundleSize from 'rollup-plugin-bundle-size'
import { defineConfig } from 'rollup'
import terser from '@rollup/plugin-terser'
import typescript from '@rollup/plugin-typescript'
import copy from 'rollup-plugin-copy'

export default defineConfig({
  input: 'src/index.ts',
  output: [
    { format: 'cjs', file: 'dist/index.js' },
    { format: 'es', file: 'dist/index.mjs' },
  ],
  plugins: [
    typescript({
      sourceMap: false,
      filterRoot: 'src'
    }),
    terser(),
    bundleSize(),
    copy({
      targets: [
        {
          src: ['LICENSE', 'README.md'],
          dest: 'dist',
        },
      ],
    }),
  ],
  external: ['itty-router', 'zod', '@asteasolutions/zod-to-openapi', 'js-yaml', 'openapi3-ts'],
})
