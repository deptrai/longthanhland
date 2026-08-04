'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { TrustBadge } from '@/components/shared/trust-badge';
import { propertyTypeLabel, listingTypeLabel } from '@/lib/labels';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

interface ListingImage {
  url: string;
  isCover: boolean;
}

interface ListingItem {
  id: string;
  title: string;
  price: number;
  area: string;
  propertyType: string;
  listingType: string;
  province: string;
  district: string;
  images: ListingImage[];
  status: string;
  trustScore?: number | null;
}

interface SearchResponse {
  items: ListingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PROPERTY_TYPES = [
  { value: 'all', label: 'Tất cả loại BĐS' },
  { value: 'land', label: 'Đất' },
  { value: 'house', label: 'Nhà' },
  { value: 'apartment', label: 'Căn hộ' },
  { value: 'commercial', label: 'Thương mại' },
];

const LISTING_TYPES = [
  { value: 'all', label: 'Tất cả' },
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

  const [q, setQ] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [propertyType, setPropertyType] = useState('all');
  const [listingType, setListingType] = useState('all');
  const [sort, setSort] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');

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
        if (propertyType !== 'all') params.set('propertyType', propertyType);
        if (listingType !== 'all') params.set('listingType', listingType);
        if (sort) params.set('sort', sort);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (minArea) params.set('minArea', minArea);
        if (maxArea) params.set('maxArea', maxArea);
        params.set('page', String(page));
        params.set('limit', '12');

        const res = await fetch(`${API_BASE_URL}/marketplace/search?${params}`);
        if (!res.ok) throw new Error('Search failed');
        const data: SearchResponse = await res.json();
        if (cancelled) return;
        setListings(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch {
        if (cancelled) return;
        setError('Lỗi tải kết quả, thử lại');
        setListings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void fetchData();
    return () => {
      cancelled = true;
    };
  }, [q, province, district, propertyType, listingType, sort, page, minPrice, maxPrice, minArea, maxArea]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const filterForm = (
    <form
      onSubmit={handleSearch}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Input
        type="text"
        placeholder="Từ khóa..."
        data-testid="search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <Input
        type="text"
        placeholder="Tỉnh/thành"
        data-testid="province-input"
        value={province}
        onChange={(e) => setProvince(e.target.value)}
      />
      <Input
        type="text"
        placeholder="Quận/huyện"
        data-testid="district-input"
        value={district}
        onChange={(e) => setDistrict(e.target.value)}
      />
      <Select
        value={propertyType}
        onValueChange={setPropertyType}
        options={PROPERTY_TYPES}
        aria-label="Loại BĐS"
      />
      <Select
        value={listingType}
        onValueChange={setListingType}
        options={LISTING_TYPES}
        aria-label="Loại giao dịch"
      />
      <Select
        value={sort}
        onValueChange={setSort}
        options={SORT_OPTIONS}
        aria-label="Sắp xếp"
      />
      <Input
        type="number"
        min={0}
        placeholder="Giá từ (đ)"
        value={minPrice}
        onChange={(e) => setMinPrice(e.target.value)}
      />
      <Input
        type="number"
        min={0}
        placeholder="Giá đến (đ)"
        value={maxPrice}
        onChange={(e) => setMaxPrice(e.target.value)}
      />
      <Input
        type="number"
        min={0}
        placeholder="Diện tích từ (m²)"
        value={minArea}
        onChange={(e) => setMinArea(e.target.value)}
      />
      <Input
        type="number"
        min={0}
        placeholder="Diện tích đến (m²)"
        value={maxArea}
        onChange={(e) => setMaxArea(e.target.value)}
      />
      <Button type="submit" className="min-h-[44px]">
        Tìm kiếm
      </Button>
    </form>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* A6: H1 display typography (DESIGN.md). */}
      <h1 className="text-display text-primary">Tin bất động sản</h1>
      <p className="mt-1 text-sm text-muted-foreground">{total} tin đăng</p>

      {/* Desktop filter (md+) — inline. */}
      <div className="mt-6 hidden md:block">{filterForm}</div>

      {/* A7: Mobile filter — drawer/sheet (<md) theo EXPERIENCE.md. */}
      <div className="mt-6 md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="min-h-[44px] w-full">
              Bộ lọc tìm kiếm
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Bộ lọc</SheetTitle>
            </SheetHeader>
            <div className="mt-4">{filterForm}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results. */}
      {loading && (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border">
              <div className="h-48 w-full animate-pulse bg-muted" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mt-8 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {!loading && !error && listings.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Không tìm thấy tin phù hợp. Thử mở rộng khu vực?
        </p>
      )}

      {/* Listing grid — A3: ảnh bìa + placeholder, A4: trust-badge overlay. */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => {
          const cover = listing.images.find((img) => img.isCover) ?? listing.images[0];
          return (
            <Link
              key={listing.id}
              href={`/listings/${listing.id}`}
              className="group overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-lg"
            >
              {/* Ảnh bìa — placeholder khi không có ảnh (A3). */}
              <div className="relative h-48 w-full bg-muted">
                {cover ? (
                  <Image
                    src={cover.url}
                    alt={listing.title}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <svg
                      className="h-12 w-12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <path d="M9 22V12h6v10" />
                    </svg>
                  </div>
                )}
                {/* Trust badge overlay góc ảnh (A4, EXPERIENCE.md). */}
                <div className="absolute right-2 top-2">
                  <TrustBadge trustScore={listing.trustScore} />
                </div>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 font-semibold text-foreground">
                  {listing.title}
                </h3>
                {/* Giá đậm (DESIGN.md listing-card). */}
                <p className="mt-1 text-lg font-bold text-primary">
                  {listing.price.toLocaleString('vi-VN')} VND
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {listing.area} m² · {listing.district}, {listing.province}
                </p>
                {/* A8: Việt hóa label. */}
                <p className="mt-1 text-xs text-muted-foreground">
                  {listingTypeLabel(listing.listingType)} ·{' '}
                  {propertyTypeLabel(listing.propertyType)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination. */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="min-h-[44px]"
          >
            ← Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="min-h-[44px]"
          >
            Sau →
          </Button>
        </div>
      )}
    </div>
  );
}
