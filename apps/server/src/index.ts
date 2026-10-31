import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Multi-path dotenv resolution: check cwd, server folder, and repo root
dotenv.config();
try {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(currentDir, '../.env') });
  dotenv.config({ path: path.resolve(currentDir, '../../../.env') });
} catch {
  // Ignore fallback resolution errors
}

import { createApp } from './app.js';

const port = process.env.PORT || 3001;
const app = createApp();

app.listen(port, () => {
  console.log(`[Research Q&A Server] listening on http://localhost:${port}`);
});
