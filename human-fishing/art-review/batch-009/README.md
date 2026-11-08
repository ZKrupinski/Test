# Batch 009 — review-only originals (2026-11-08)

The prior ChatGPT Work session recorded **30 individually generated RGBA images**: 18 real fish and 12 fictional special creatures. Their filenames, dimensions, intended morphology and SHA-256 values are in [review-manifest.json](review-manifest.json).

**Actual GitHub state:** No batch-009 PNG bytes were uploaded, no game IDs were assigned, and **0** species were activated. The original images are referenced as `exec-*.png` in the originating ChatGPT session; these file references are not downloadable GitHub URLs. Do not substitute a different image or mark an asset LIVE without checking its bytes against the recorded SHA-256.

**Visual holds:** Five special creatures (유리심장 해파리, 심연의 종탑 생물, 삼중입 나팔아귀, 은하우산 해파리, 산호갑옷 거북) still have broad halo/alpha issues after one cleanup attempt. All 30 also require silhouette/anatomy, transparency edges, habitat and size validation.

**Preserved live build:** 333 fish (F001–F354 with historical gaps/expansion IDs) plus S001 special creature = 334 catchable creatures. Earlier sprites, saves, and regional codex order are unchanged.

**To complete the installation safely:**
1. Obtain each full-resolution PNG from its originating session, verify decoded RGBA/dimensions, and compare its SHA-256 to the review manifest before applying any edits.
2. Resolve the five halo holds and compare all 18 fish against the live catalog and other pending artworks for duplicate morphology—not just name or recoloring. Validate real habitats/adult sizes.
3. Assign only new IDs; generate per-species rarity, level, unique behavior, region and art placement. Map fictional special creatures separately from real-fish counts.
4. Commit the verified PNG blobs and installation metadata/catalog/ready gate together via GitHub, run the complete QA suite and wait for a successful Pages deploy and deployed-image hash check.

Automated integrity and nonactivation assertions: `node human-fishing/qa-fish-art-batch-009.cjs`.

**Do not change the current catchable count from 334 solely because a manifest records 30 generated images.**
