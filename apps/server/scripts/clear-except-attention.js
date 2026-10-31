import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { QdrantClient } from '@qdrant/js-client-rest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multi-path dotenv resolution
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function clearExceptAttention() {
  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;

  if (!url) {
    console.error('Error: QDRANT_URL is not set in environment.');
    process.exit(1);
  }

  const client = new QdrantClient({ url, apiKey, checkCompatibility: false });
  const colName = 'research_paper_chunks';

  const exists = await client.collectionExists(colName);
  if (!exists.exists) {
    console.log(`Collection "${colName}" does not exist. Nothing to clear.`);
    return;
  }

  console.log('Fetching points from Qdrant Cloud...');
  const scroll = await client.scroll(colName, { limit: 2000, with_payload: true });

  const toDeleteIds = [];
  const deletedPapers = new Map();
  let keptCount = 0;

  for (const pt of scroll.points) {
    const payload = pt.payload || {};
    const pid = String(payload.paperId || '');
    const title = String(payload.paperTitle || '').toLowerCase().trim();

    const isAttention = pid === 'paper-attention' || title === 'attention is all you need';

    if (isAttention) {
      keptCount++;
    } else {
      toDeleteIds.push(pt.id);
      const paperName = payload.paperTitle || pid || 'Unknown';
      deletedPapers.set(paperName, (deletedPapers.get(paperName) || 0) + 1);
    }
  }

  console.log(`\n==============================================`);
  console.log(`   QDRANT CLOUD SELECTIVE CLEAR`);
  console.log(`==============================================`);
  console.log(`Total Points Found : ${scroll.points.length}`);
  console.log(`Preserving         : "Attention Is All You Need" (${keptCount} chunks)`);
  console.log(`Removing           : ${toDeleteIds.length} chunks from ${deletedPapers.size} papers\n`);

  if (deletedPapers.size > 0) {
    console.log('Papers being removed:');
    for (const [title, count] of deletedPapers.entries()) {
      console.log(` - "${title}" (${count} chunks)`);
    }
  }

  if (toDeleteIds.length > 0) {
    // Delete in batches of 100
    const batchSize = 100;
    for (let i = 0; i < toDeleteIds.length; i += batchSize) {
      const batch = toDeleteIds.slice(i, i + batchSize);
      await client.delete(colName, {
        wait: true,
        points: batch,
      });
    }
    console.log(`\nSuccessfully deleted ${toDeleteIds.length} points from Qdrant Cloud.`);
  } else {
    console.log('\nNo extra points found. Collection is already clean.');
  }

  // Also clean up uploaded PDF files from apps/server/uploads while keeping attention-is-all-you-need.pdf
  const uploadDir = path.resolve(__dirname, '../uploads');
  if (fs.existsSync(uploadDir)) {
    const files = fs.readdirSync(uploadDir);
    let cleanedFiles = 0;
    for (const f of files) {
      if (f !== 'attention-is-all-you-need.pdf' && f.endsWith('.pdf')) {
        try {
          fs.unlinkSync(path.join(uploadDir, f));
          cleanedFiles++;
        } catch {}
      }
    }
    if (cleanedFiles > 0) {
      console.log(`Cleaned ${cleanedFiles} uploaded PDF files from disk.`);
    }
  }

  console.log(`==============================================\n`);
}

clearExceptAttention().catch((err) => {
  console.error('Failed to clear Qdrant collection:', err);
  process.exit(1);
});
