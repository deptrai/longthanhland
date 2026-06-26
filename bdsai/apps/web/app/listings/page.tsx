'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

interface ListingItem {
  id: string;
  title: string;
  price: number;
  area: string;
  propertyType: string;
  listingType: string;
  province: string;
  district: string;
  images: Array<{ url: string; isCover: boolean }>;
  status: string;
}

interface SearchResponse {
  items: ListingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PROPERTY_TYPES = [
  { value: '', label: 'Tất cả loại BĐS' },
  { value: 'land', label: 'Đất' },
  { value: 'house', label: 'Nhà' },
  { value: 'apartment', label: 'Căn hộ' },
  { value: 'commercial', label: 'Thương mại' },
];

const LISTING_TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'sell', label: 'Bán' },
  { value: 'rent', label: 'Cho thuê' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'price_asc', label: 'Giá thấp → cao' },
  { value: 'price_desc', label: 'Giá cao → thấp' },
];

export default function ListingsPage() {
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [q, setQ] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [listingType, setListingType] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    let cancelled = false;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (province) params.set('province', province);
        if (district) params.set('district', district);
        if (propertyType) params.set('propertyType', propertyType);
        if (listingType) params.set('listingType', listingType);
        if (sort) params.set('sort', sort);
        params.set('page', String(page));
        params.set('limit', '12');

        const res = await fetch(`${API_BASE_URL}/marketplace/search?${params}`);
        if (!res.ok) throw new Error('Search failed');
        const data: SearchResponse = await res.json();
        if (cancelled) return;
        setListings(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Lỗi tải danh sách');
        setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [q, province, district, propertyType, listingType, sort, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Tin bất động sản</h1>
      <p className="mt-1 text-sm text-gray-500">{total} tin đăng</p>

      {/* Search + Filters */}
      <form onSubmit={handleSearch} className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          placeholder="Từ khóa..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Tỉnh/thành"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="text"
          placeholder="Quận/huyện"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <select
          value={propertyType}
          onChange={(e) => setPropertyType(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {PROPERTY_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={listingType}
          onChange={(e) => setListingType(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {LISTING_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Tìm kiếm
        </button>
      </form>

      {/* Results */}
      {loading && <p className="mt-8 text-gray-500">Đang tải...</p>}
      {error && <p className="mt-8 text-red-600">Lỗi: {error}</p>}
      {!loading && !error && listings.length === 0 && (
        <p className="mt-8 text-gray-500">Không tìm thấy tin nào.</p>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => {
          const cover = listing.images.find((img) => img.isCover) ?? listing.images[0];
          return (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="overflow-hidden rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
            >
              {cover && (
                <div className="relative h-48 w-full bg-gray-100">
                  <Image
                    src={cover.url}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 line-clamp-2">{listing.title}</h3>
                <p className="mt-1 text-lg font-bold text-blue-600">
                  {listing.price.toLocaleString('vi-VN')} VND
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {listing.area} m² · {listing.district}, {listing.province}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {listing.listingType === 'sell' ? 'Bán' : 'Cho thuê'} · {listing.propertyType}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            ← Trước
          </button>
          <span className="text-sm text-gray-600">
            Trang {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded-md border border-gray-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Sau →
          </button>
        </div>
      )}
    </div>
  );
}
