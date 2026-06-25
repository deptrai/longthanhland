// bdsai.vn — Lighthouse CI config (Story 1.3, AC4, AD-4 SSR Boundary).
//
// Post-deploy quality gate: SEO category score ≥ 90 trên public SSR pages.
// Chạy trong deploy.yml job `lighthouse` (needs: deploy-web) trên URL production.
//
// Pages gate (story 1.3 chốt):
//   - `/`              — home (SSR placeholder có từ 1.1). CHỈ gate page này.
//   - `/listings`      — TODO(story 3.3): thêm khi SSR browse page ready.
//   - `/listings/[id]` — TODO(story 3.4): thêm khi detail SSR page ready.
//
// Lý do chỉ gate `/` ở 1.3: web app hiện chỉ có route `/` (prerender từ 1.1).
// Gate `/listings` khi route chưa tồn tại → 404 → spurious fail mỗi deploy.
// Thêm 2 page còn lại khi story 3.3/3.4 sinh SSR page thật.
//
// Lighthouse CI action: treosh/lighthouse-ci-action@v11 (đọc configPath này).

/** @type {import('@lhci/cli').Config} */
module.exports = {
  ci: {
    collect: {
      // URL production — override qua LHCI_URL nếu cần (mặc định bdsai.vn).
      url: ['https://bdsai.vn/'],
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
