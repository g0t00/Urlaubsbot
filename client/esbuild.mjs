import * as esbuild from 'esbuild'
import { argv } from 'process'
const devMode = argv[2] === '-d';
const settings = {
  entryPoints: ['src/index.tsx'],
  sourcemap: 'linked',
  bundle: true,
  loader: {
    '.woff': 'file',
    '.woff2': 'file'
  },
  minify: true,
  outdir: 'dist',
}
if (devMode) {
  const ctx = await esbuild.context(settings);
  console.log('running in watch mode')
  await ctx.watch();
} else {
  await esbuild.build(settings)

}