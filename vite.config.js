import { sveltekit } from '@sveltejs/kit/vite';
import { poseSaver } from './tools/pose-saver.js';

export default {
  plugins: [sveltekit(), poseSaver()]
};
