// services/ragService.js
// Vectra Vector Database (pure Node.js — no Python, no Docker)
// npm install vectra  ← that's all you need
const fs     = require("fs");
const path   = require("path");
const OpenAI = require("openai");
const { LocalIndex } = require("vectra");
const { getAllPolicies } = require("../db/database");
const { logger }        = require("../utils/logger");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Vectra local index (persists to disk as JSON files) ──
const INDEX_PATH = path.join(__dirname, "../data/vector_index");
let   index      = null;
let   indexReady = false;

// ── Chunk text with overlap ──
function chunkText(text, size = 400, overlap = 60) {
  const words  = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += size - overlap) {
    const chunk = words.slice(i, i + size).join(" ");
    if (chunk.trim().length > 40) chunks.push(chunk);
  }
  return chunks;
}

// ── Cosine similarity (kept for unit tests) ──
function cosineSimilarity(a, b) {
  let dot = 0, ma = 0, mb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    ma  += a[i] * a[i];
    mb  += b[i] * b[i];
  }
  return ma && mb ? dot / (Math.sqrt(ma) * Math.sqrt(mb)) : 0;
}

// ── Get OpenAI embedding ──
async function getEmbedding(text) {
  const res = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    input: text.substring(0, 8000),
  });
  return res.data[0].embedding;
}

// ── Get or create Vectra index ──
async function getIndex() {
  if (index) return index;
  index = new LocalIndex(INDEX_PATH);
  if (!await index.isIndexCreated()) {
    await index.createIndex();
    logger.info("✅ Vectra index created at: " + INDEX_PATH);
  } else {
    logger.info("✅ Vectra index loaded from: " + INDEX_PATH);
  }
  return index;
}

// ── Build vector index from PDF + MySQL policies ──
async function buildVectorIndex() {
  if (indexReady) return;
  logger.info("🔨 Building vector index with Vectra + OpenAI embeddings...");

  const idx = await getIndex();

  // Check if already populated
  const stats = await idx.getIndexStats();
  if (stats.items > 0) {
    logger.info(`✅ Vectra already has ${stats.items} vectors — skipping rebuild`);
    indexReady = true;
    return;
  }

  // ── 1. Index PDF handbook ──
  try {
    const pdfParse = require("pdf-parse");
    const buffer   = fs.readFileSync(
      path.join(__dirname, "../data/University_Handbook_Complete_Detailed.pdf")
    );
    const pdfData  = await pdfParse(buffer);
    const chunks   = chunkText(pdfData.text, 400, 60);
    logger.info(`📄 Indexing ${chunks.length} handbook chunks into Vectra...`);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await getEmbedding(chunks[i]);
      await idx.insertItem({
        vector: embedding,
        metadata: {
          text:    chunks[i],
          source:  "University_Handbook_Complete_Detailed.pdf",
          section: `Section ${Math.ceil((i + 1) / 2)}`,
          chunk:   i + 1,
          type:    "handbook",
        },
      });
    }
    logger.info(`📄 Handbook indexed: ${chunks.length} chunks → Vectra`);
  } catch (e) {
    logger.warn("PDF indexing failed: " + e.message);
  }

  // ── 2. Index policies from MySQL ──
  const policies = await getAllPolicies();
  for (const p of policies) {
    const text = `[${p.policy_category}] ${p.policy_title}: ${p.details}`;
    const embedding = await getEmbedding(text);
    await idx.insertItem({
      vector: embedding,
      metadata: {
        text,
        source:   "university_policies",
        section:  `${p.policy_category} - ${p.policy_title}`,
        category: p.policy_category,
        type:     "policy",
      },
    });
  }
  logger.info(`📋 Policies indexed: ${policies.length} entries → Vectra`);

  const finalStats = await idx.getIndexStats();
  indexReady = true;
  logger.info(`✅ Vectra vector index ready: ${finalStats.items} vectors total`);
}

// ── Top-K semantic retrieval from Vectra ──
async function retrieveTopK(query, k = 5) {
  if (!indexReady) await buildVectorIndex();

  const idx      = await getIndex();
  const queryEmb = await getEmbedding(query);

  const results = await idx.queryItems(queryEmb, k);

  return results
    .filter(r => r.score >= 0.20)
    .map(r => ({
      text:     r.item.metadata.text,
      metadata: r.item.metadata,
      score:    r.score,
    }));
}

// ── Main RAG answer generation ──
async function answerWithRAG(query) {
  const t0      = Date.now();
  const topDocs = await retrieveTopK(query, 5);

  // Not found fallback
  if (topDocs.length === 0) {
    return {
      answer:      "Information not available in the university policy documents. Please contact the administration.",
      citations:   [],
      confidence:  "low",
      query_type:  "policy",
      tokens_used: 0,
      latency_ms:  Date.now() - t0,
    };
  }

  // Build context from retrieved docs
  const context = topDocs
    .map((d, i) =>
      `[Source ${i + 1}: ${d.metadata.source} | ${d.metadata.section}]\n${d.text}`)
    .join("\n\n");

  // Unique citations
  const citations = [...new Set(
    topDocs.map(d => `${d.metadata.source} - ${d.metadata.section}`)
  )];

  // Confidence from avg similarity score
  const avg  = topDocs.reduce((s, d) => s + d.score, 0) / topDocs.length;
  const conf = avg >= 0.60 ? "high" : avg >= 0.40 ? "medium" : "low";

  const systemPrompt = `You are a helpful University Assistant AI.
Answer ONLY based on the context below. Never fabricate information.
If the answer is not in the context, say "Information not available in the policy documents."
Always cite your source. Be concise and student-friendly.

Context:
${context}`;

  const resp = await openai.chat.completions.create({
    model:       process.env.OPENAI_MODEL || "gpt-4o-mini",
    max_tokens:  800,
    temperature: 0.1,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: query },
    ],
  });

  return {
    answer:      resp.choices[0].message.content,
    citations,
    confidence:  conf,
    query_type:  "policy",
    tokens_used: resp.usage?.total_tokens || 0,
    latency_ms:  Date.now() - t0,
  };
}

module.exports = {
  buildVectorIndex, answerWithRAG, retrieveTopK,
  getEmbedding, chunkText, cosineSimilarity,
};
