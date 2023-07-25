// rollup.config.js
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import legacy from '@rollup/plugin-legacy';


export default {
  input: 'src/main.js', // Your input file
  output: {
    file: 'dist/bundle.js', // Output file
    format: 'iife', // Immediately-invoked Function Expression (suitable for <script> tags) 
    name: 'MyCables',
    sourcemap: 'inline',
    globals: {
      CABLES: 'CABLES', // Tell Rollup that `CABLES` is a global variable
    },
  },
  plugins: [
    resolve(),
    // commonjs(),
    legacy({
      'public/js/patch.js': 'CABLES' // Map the global 'CABLES' to 'patch.js'
    }),
    terser()
  ]
};