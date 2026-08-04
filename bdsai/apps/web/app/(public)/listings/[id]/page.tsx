import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { InquiryForm } from './inquiry-form';
import { AppealButton } from './appeal-button';
import { TrustBadge } from '@/components/shared/trust-badge';
import { propertyTypeLabel, listingTypeLabel } from '@/lib/labels';

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

  // Fetch AI trust score server-side cho TrustBadge (A5).
  let aiTrustScore: number | null = null;
  let aiSummary: string | null = null;
  try {
    const aiRes = await fetch(`${API_BASE_URL}/ai/listings/${id}`, { cache: 'no-store' });
    if (aiRes.ok) {
      const aiData = await aiRes.json();
      aiTrustScore = aiData.trustScore ?? null;
      aiSummary = aiData.summary ?? null;
    }
  } catch {
    // Graceful — trust badge hiện "Chưa đủ dữ liệu".
  }

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
            // Story 6.4: image phải là array, price phải là string (Google requirement).
            image: listing.images.map((img: { url: string }) => img.url),
            offers: {
              '@type': 'Offer',
              price: String(listing.price),
              priceCurrency: 'VND',
            },
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
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">Trang chủ</Link>
        {' / '}
        <Link href="/listings" className="hover:underline">Tin bất động sản</Link>
        {' / '}
        <span className="text-foreground">{listing.title}</span>
      </nav>

      {/* A6: Title display typography + A5: trust-badge inline. */}
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-display text-primary">{listing.title}</h1>
        <TrustBadge trustScore={aiTrustScore} className="mt-2 shrink-0" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-primary">{priceText}</p>
      <p className="mt-1 text-muted-foreground">{locationText}</p>

      {/* Cover image — placeholder khi không có ảnh (A5). */}
      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        {coverImage ? (
          <Image
            src={coverImage.url}
            alt={listing.title}
            width={1200}
            height={630}
            className="h-96 w-full object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        ) : (
          <div className="flex h-96 w-full items-center justify-center bg-muted text-muted-foreground">
            <svg
              className="h-24 w-24"
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
      </div>

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

      {/* Details grid — shadcn tokens + A8 Việt hóa. */}
      <div className="mt-8 grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-6 md:grid-cols-3">
        <DetailItem label="Loại giao dịch" value={listingTypeLabel(listing.listingType)} />
        <DetailItem label="Loại BĐS" value={propertyTypeLabel(listing.propertyType)} />
        <DetailItem label="Diện tích" value={`${listing.area} m²`} />
        {listing.bedrooms != null && <DetailItem label="Phòng ngủ" value={String(listing.bedrooms)} />}
        {listing.bathrooms != null && <DetailItem label="Phòng tắm" value={String(listing.bathrooms)} />}
        {listing.floorCount != null && <DetailItem label="Số tầng" value={String(listing.floorCount)} />}
        {listing.legalStatus && <DetailItem label="Pháp lý" value={listing.legalStatus} />}
      </div>

      {/* Description — tách rõ "Mô tả của người bán" vs "Phân tích AI" (EXPERIENCE.md). */}
      <div className="mt-8">
        <h2 className="text-display-sm text-primary">Mô tả của người bán</h2>
        <p className="mt-2 whitespace-pre-wrap text-foreground">{listing.description}</p>
      </div>

      {/* Contact CTA — Story 6.1 inquiry form */}
      <InquiryForm listingId={listing.id} />

      {/* A5: AI Insights — border emerald + icon AI + chip "Phân tích bởi AI" (DESIGN.md ai-insight-card). */}
      {(aiSummary || aiTrustScore != null) && (
        <div className="mt-8 rounded-lg border border-accent/40 bg-accent/5 p-6">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-accent"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 2a3 3 0 013 3c0 1.5-1 2-1 3a3 3 0 013 3v1a3 3 0 01-3 3h-6a3 3 0 01-3-3v-1a3 3 0 013-3c0-1-1-1.5-1-3a3 3 0 013-3z" />
              <path d="M9 18h6M10 22h4" />
            </svg>
            <h2 className="text-display-sm text-primary">Phân tích AI</h2>
            <span className="ml-auto rounded-sm bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
              Phân tích bởi AI · bdsai.vn
            </span>
          </div>

          {/* Trust Score — progress bar emerald. */}
          {aiTrustScore != null && (
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">Điểm uy tín:</span>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-32 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${aiTrustScore}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-foreground">{aiTrustScore}/100</span>
                </div>
              </div>
              {/* EXPERIENCE.md: disclaimer minh bạch. */}
              <p className="mt-2 text-xs text-muted-foreground">
                * Điểm tham khảo do AI tạo, không phải xác nhận pháp lý.
              </p>
            </div>
          )}

          {/* AI Summary */}
          {aiSummary && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground">Tóm tắt AI</h3>
              <p className="mt-1 text-sm text-muted-foreground">{aiSummary}</p>
            </div>
          )}

          {/* Story 4.4 AC: seller appeal button. */}
          <div className="mt-4">
            <AppealButton listingId={listing.id} />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  );
}
