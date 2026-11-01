# 09: Seeded Manuscript Golden Evaluation Dataset

**What to build:** Create a version-controlled benchmark dataset `apps/server/evals/datasets/attention-golden.json` targeting the authentic *Attention Is All You Need* paper. The dataset supplies ground-truth reference answers and strict citation targets across architectural specs, formulas, tabular data, and out-of-scope negative assertions.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Create `apps/server/evals/datasets/attention-golden.json` with structured test case schema (`id`, `paperId`, `query`, `referenceAnswer`, `expectedCitations`, `focusMetric`).
- [ ] Cover multi-head attention projection dimensions ($d_k, d_v, d_{model}, h$) referencing Section 3.2.2 and Page 4.
- [ ] Cover BLEU scores on WMT 2014 translation tasks referencing Table 2 on Page 8.
- [ ] Cover scaled dot-product attention formula referencing Section 3.2.1 and Page 4.
- [ ] Cover negative/unanswerable query to test graceful abstention without hallucinations.
