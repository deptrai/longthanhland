import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

// Story 3.4 — Listing detail SSR page + SEO meta.
// Server component (AD-4) — fetch listing via API proxy, generateMetadata dynamic.
// Only PUBLISHED listings accessible publicly; non-PUBLISHED → 404.

const API_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3101';

interface ListingImage {
  url: string;
  isCover: boolean;
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  area: string;
  propertyType: string;
  listingType: string;
  province: string;
  district: string;
  ward: string | null;
  street: string | null;
  address: string;
  bedrooms: number | null;
  bathrooms: number | null;
  floorCount: number | null;
  legalStatus: string | null;
  images: ListingImage[];
  status: string;
  createdAt: string;
  publishedAt: string | null;
}

async function fetchListing(id: string): Promise<Listing | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/marketplace/listings/${id}`, {
      method: 'GET',
      // No auth — public access for PUBLISHED only. NestJS returns 403 for non-PUBLISHED.
      cache: 'force-cache',
    });
    if (!res.ok) return null;
    return (await res.json()) as Listing;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) {
    return { title: 'Tin không tồn tại — bdsai.vn' };
  }
  const coverImage = listing.images.find((img) => img.isCover) ?? listing.images[0];
  const title = `${listing.title} — ${listing.price.toLocaleString('vi-VN')} VND | bdsai.vn`;
  const description = listing.description.slice(0, 160);
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: coverImage ? [{ url: coverImage.url, width: 1200, height: 630 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: coverImage ? [coverImage.url] : [],
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await fetchListing(id);
  if (!listing) {
    notFound();
  }

  const coverImage = listing.images.find((img) => img.isCover) ?? listing.images[0];
  const priceText = `${listing.price.toLocaleString('vi-VN')} VND`;
  const locationText = [listing.address, listing.district, listing.province]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mx-auto max-w-4xl py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:underline">Trang chủ</Link>
        {' / '}
        <Link href="/marketplace" className="hover:underline">Tin bất động sản</Link>
        {' / '}
        <span className="text-gray-700">{listing.title}</span>
      </nav>

      {/* Title + price */}
      <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
      <p className="mt-2 text-2xl font-semibold text-blue-600">{priceText}</p>
      <p className="mt-1 text-gray-600">{locationText}</p>

      {/* Cover image */}
      {coverImage && (
        <div className="mt-6 overflow-hidden rounded-lg">
          <Image
            src={coverImage.url}
            alt={listing.title}
            width={1200}
            height={630}
            className="h-96 w-full object-cover"
            priority
            unoptimized
          />
        </div>
      )}

      {/* Image gallery */}
      {listing.images.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {listing.images.map((img, idx) => (
            <div key={idx} className="overflow-hidden rounded-md">
              <Image
                src={img.url}
                alt={`Ảnh ${idx + 1}`}
                width={200}
                height={150}
                className="h-24 w-full object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      )}

      {/* Details grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 rounded-lg border border-gray-200 p-6 md:grid-cols-3">
        <DetailItem label="Loại giao dịch" value={listing.listingType === 'sell' ? 'Bán' : 'Cho thuê'} />
        <DetailItem label="Loại BĐS" value={listing.propertyType} />
        <DetailItem label="Diện tích" value={`${listing.area} m²`} />
        {listing.bedrooms != null && <DetailItem label="Phòng ngủ" value={String(listing.bedrooms)} />}
        {listing.bathrooms != null && <DetailItem label="Phòng tắm" value={String(listing.bathrooms)} />}
        {listing.floorCount != null && <DetailItem label="Số tầng" value={String(listing.floorCount)} />}
        {listing.legalStatus && <DetailItem label="Pháp lý" value={listing.legalStatus} />}
      </div>

      {/* Description */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold">Mô tả chi tiết</h2>
        <p className="mt-2 whitespace-pre-wrap text-gray-700">{listing.description}</p>
      </div>

      {/* Contact CTA */}
      <div className="mt-8 rounded-lg bg-blue-50 p-6 text-center">
        <p className="text-lg font-semibold text-blue-900">Quan tâm tin này?</p>
        <a
          href={`/api/marketplace/listings/${listing.id}/inquiry`}
          className="mt-3 inline-block rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
        >
          Liên hệ người bán
        </a>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}
