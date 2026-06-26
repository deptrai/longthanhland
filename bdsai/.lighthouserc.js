// bdsai.vn — Lighthouse CI config (Story 1.3, AC4, AD-4 SSR Boundary).
//
// Post-deploy quality gate: SEO category score ≥ 90 trên public SSR pages.
// Chạy trong deploy.yml job `lighthouse` (needs: deploy-web) trên URL production.
//
// Pages gate (Story 6.5: thêm /listings + /listings/[id] sau khi 3.3/3.4 done):
//   - `/`              — home (SSR placeholder có từ 1.1).
//   - `/listings`      — SSR browse page (Story 3.3).
//   - `/listings/[id]` — detail SSR page (Story 3.4) — dùng sample listing URL.
//
// Lighthouse CI action: treosh/lighthouse-ci-action@v11 (đọc configPath này).

/** @type {import('@lhci/cli').Config} */
module.exports = {
  ci: {
    collect: {
      // URL production — override qua LHCI_URL nếu cần (mặc định bdsai.vn).
      // Story 6.5: gate 3 routes chính.
      url: [
        'https://bdsai.vn/',
        'https://bdsai.vn/listings',
        'https://bdsai.vn/listings/00000000-0000-0000-0000-000000000001',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      // SEO ≥ 90 (0.9). Fail assertion → exit 1 → job fail → post-deploy gate.
      assertions: {
        'categories:seo': ['error', { minScore: 0.9 }],
        // Best-practices baseline (non-blocking warn) — theo dõi dần.
        'categories:performance': ['warn', { minScore: 0.5 }],
        'categories:accessibility': ['warn', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
