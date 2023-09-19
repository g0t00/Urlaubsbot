import * as esbuild from 'esbuild'
import { argv } from 'process'

const settings = {
  entryPoints: ['src/index.tsx'],
  bundle: true,
  loader: {
    '.woff': 'file',
    '.woff2': 'file',
  },
  outdir: 'dist',
}
if (argv[2] === '-w') {
  const ctx = await esbuild.context(settings);
  console.log('running in watch mode')
  await ctx.watch();
} else {
  await esbuild.build(settings)

}