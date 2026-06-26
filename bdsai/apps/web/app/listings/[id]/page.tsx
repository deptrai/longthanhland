import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { InquiryForm } from './inquiry-form';
import { AppealButton } from './appeal-button';

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
    const res = await fetch(`${API_BASE_URL}/marketplace/listings/${id}/detail`, {
      method: 'GET',
      // No auth — public access for PUBLISHED only. NestJS returns 403 for non-PUBLISHED.
      // Story 6.5: ISR caching — revalidate every 300s (5 min) for performance.
      next: { revalidate: 300 },
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
      {/* Story 6.4: JSON-LD structured data (Schema.org RealEstateListing). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'RealEstateListing',
            name: listing.title,
            description: listing.description,
            url: `https://bdsai.vn/listings/${listing.id}`,
            image: coverImage?.url,
            price: listing.price,
            priceCurrency: 'VND',
            address: {
              '@type': 'PostalAddress',
              streetAddress: listing.address,
              addressLocality: listing.district,
              addressRegion: listing.province,
              addressCountry: 'VN',
            },
            ...(listing.area && { floorSize: { '@type': 'QuantitativeValue', value: Number(listing.area), unitText: 'm²' } }),
            ...(listing.bedrooms != null && { numberOfBedrooms: listing.bedrooms }),
            ...(listing.bathrooms != null && { numberOfBathroomsTotal: listing.bathrooms }),
            datePublished: listing.publishedAt,
            ...('expiresAt' in listing && listing.expiresAt ? { availabilityEnds: listing.expiresAt } : {}),
          }),
        }}
      />

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
            sizes="(max-width: 768px) 100vw, 1200px"
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
                sizes="(max-width: 768px) 25vw, 200px"
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

      {/* Contact CTA — Story 6.1 inquiry form */}
      <InquiryForm listingId={listing.id} />

      {/* Story 4.4: AI Insights block (graceful hide if no AI result). */}
      <AiInsightsBlock listingId={listing.id} />
    </div>
  );
}

// Story 4.4 — AI insights block with disclaimer (async client component).
// Nếu chưa có AI result (job chưa chạy/lỗi) → ẩn gọn gàng, không vỡ layout.
async function AiInsightsBlock({ listingId }: { listingId: string }) {
  let aiResult: { summary?: string | null; trustScore?: number | null; trustScoreFactors?: Record<string, number> | null } | null = null;
  try {
    const res = await fetch(`${API_BASE_URL}/ai/listings/${listingId}`, { cache: 'no-store' });
    if (res.ok) {
      aiResult = await res.json();
    }
  } catch {
    // Graceful hide on error.
  }

  if (!aiResult || (!aiResult.summary && aiResult.trustScore == null)) {
    return null; // Hide block if no AI data.
  }

  return (
    <div className="mt-8 rounded-lg border border-purple-200 bg-purple-50 p-6">
      <h2 className="text-lg font-semibold text-purple-900">Phân tích AI</h2>

      {/* Trust Score */}
      {aiResult.trustScore != null && (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-purple-700">Điểm uy tín:</span>
            <div className="flex items-center gap-2">
              <div className="h-3 w-32 overflow-hidden rounded-full bg-purple-200">
                <div
                  className="h-full rounded-full bg-purple-600"
                  style={{ width: `${aiResult.trustScore}%` }}
                />
              </div>
              <span className="text-sm font-bold text-purple-900">{aiResult.trustScore}/100</span>
            </div>
          </div>
          {/* Story 4.4 AC: disclaimer minh bạch. */}
          <p className="mt-2 text-xs text-purple-600">
            * Điểm tham khảo do AI tạo, không phải xác nhận pháp lý.
          </p>
        </div>
      )}

      {/* AI Summary */}
      {aiResult.summary && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-purple-800">Tóm tắt AI</h3>
          <p className="mt-1 text-sm text-gray-700">{aiResult.summary}</p>
        </div>
      )}

      {/* Story 4.4 AC: seller appeal button — functional. */}
      <div className="mt-4">
        <AppealButton listingId={listing.id} />
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
