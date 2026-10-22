import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

const port = process.env.PORT || 3001;
const app = createApp();

app.listen(port, () => {
  console.log(`[Research Q&A Server] listening on http://localhost:${port}`);
});
