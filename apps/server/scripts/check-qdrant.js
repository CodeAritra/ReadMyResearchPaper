import 'dotenv/config';
import { QdrantClient } from '@qdrant/js-client-rest';

async function main() {
  const url = process.env.QDRANT_URL;
  const apiKey = process.env.QDRANT_API_KEY;
  if (!url) {
    console.error('QDRANT_URL is not defined in .env');
    process.exit(1);
  }

  const client = new QdrantClient({ url, apiKey, checkCompatibility: false });
  const colName = 'research_paper_chunks';
  const exists = await client.collectionExists(colName);
  if (!exists.exists) {
    console.log(`Collection "${colName}" does not exist yet.`);
    return;
  }

  const info = await client.getCollection(colName);
  const scroll = await client.scroll(colName, { limit: 1000, with_payload: true });

  const papers = new Map();
  for (const pt of scroll.points) {
    const payload = pt.payload || {};
    const pid = payload.paperId || 'unknown';
    if (!papers.has(pid)) {
      papers.set(pid, {
        title: payload.paperTitle || 'Unknown',
        chunks: 0,
      });
    }
    papers.get(pid).chunks++;
  }

  console.log('\n========================================');
  console.log('   QDRANT CLOUD COLLECTION OVERVIEW     ');
  console.log('========================================');
  console.log(`Collection Name : ${colName}`);
  console.log(`Cluster Status  : ${info.status}`);
  console.log(`Total Chunks    : ${info.points_count ?? scroll.points.length}`);
  console.log(`Total PDFs      : ${papers.size}\n`);
  console.log('Indexed Papers:');
  for (const [id, data] of papers.entries()) {
    console.log(` - "${data.title}" [${data.chunks} chunks] (ID: ${id})`);
  }
  console.log('========================================\n');
}

main().catch((err) => console.error('Error fetching Qdrant stats:', err));
