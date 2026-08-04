'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// Story 5.8: Public BĐS news feed page.
// GET /api/news?page=1&limit=20&category=... → NestJS /news (public).

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  category: string;
  imageUrl: string | null;
  publishedAt: string;
}

interface NewsListResponse {
  items: NewsArticle[];
  total: number;
  page: number;
  limit: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  'thi-truong': 'Thị trường',
  'phap-ly': 'Pháp lý',
  'du-an': 'Dự án',
  'tai-chinh': 'Tài chính',
};

const CATEGORIES = [
  { key: '', label: 'Tất cả' },
  { key: 'thi-truong', label: 'Thị trường' },
  { key: 'phap-ly', label: 'Pháp lý' },
  { key: 'du-an', label: 'Dự án' },
  { key: 'tai-chinh', label: 'Tài chính' },
];

export default function NewsPage() {
  const [data, setData] = useState<NewsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('');

  const reload = useCallback(async (category: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = category ? `?category=${category}&limit=20` : '?limit=20';
      const res = await fetch(`/api/news${qs}`);
      const body = (await res.json()) as NewsListResponse & { message?: string };
      if (!res.ok) {
        setError(body.message ?? 'Tải tin tức thất bại');
        return;
      }
      setData(body);
    } catch {
      setError('Lỗi mạng, thử lại sau');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload(activeCategory);
  }, [activeCategory, reload]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Tin tức BĐS</h1>

      {/* Category tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setActiveCategory(cat.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === cat.key
                ? 'bg-blue-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-center text-sm text-muted-foreground">Đang tải...</p>
      ) : data && data.items.length > 0 ? (
        <div className="flex flex-col gap-4">
          {data.items.map((article) => (
            <article key={article.id} className="overflow-hidden rounded-lg border border-border">
              {article.imageUrl && (
                <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                </a>
              )}
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {CATEGORY_LABELS[article.category] ?? article.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(article.publishedAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <h2 className="mb-2 text-lg font-semibold">
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {article.title}
                  </a>
                </h2>
                <p className="mb-3 text-sm text-muted-foreground line-clamp-3">
                  {article.summary}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Nguồn: {article.sourceName}
                  </span>
                  <a
                    href={article.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    Đọc thêm ↗
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Chưa có tin tức.
        </p>
      )}
    </div>
  );
}
