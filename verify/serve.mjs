// Serve the built site locally: node verify/serve.mjs [dir] [port]
import { serve } from './lib/static-server.mjs';

const [dir = 'dist', port = '8080'] = process.argv.slice(2);
const s = await serve(dir, { port: Number(port) });
console.log(`serving ${dir} at ${s.url}`);
