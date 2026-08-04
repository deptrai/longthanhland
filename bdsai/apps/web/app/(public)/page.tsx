import Link from 'next/link';

import { Button } from '@/components/ui/button';

// Homepage — hero sản phẩm thật (DESIGN.md + EXPERIENCE.md).
// Server component (AD-4 SSR). Display typography 44px dẫn dắt.
export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4">
      {/* Hero — display typography mạnh, microcopy sản phẩm (DESIGN.md Brand). */}
      <section className="flex flex-col items-center gap-6 py-20 text-center md:py-28">
        <h1
          data-testid="hero-title"
          className="text-display text-primary md:text-6xl"
        >
          Tin bất động sản đáng tin
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground md:text-xl">
          Sàn rao vặt bất động sản AI Việt Nam. Mỗi tin được AI đánh giá
          uy tín — để bạn mua bán an tâm, không lo tin ảo.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-h-[44px]">
            <Link href="/listings">Tìm tin bất động sản</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="min-h-[44px]">
            <Link href="/dashboard/dang-tin">Đăng tin miễn phí</Link>
          </Button>
        </div>
      </section>

      {/* Value props — 3 cột, minh bạch định vị AI-powered (PRD Section 11.3). */}
      <section className="grid grid-cols-1 gap-8 py-12 md:grid-cols-3 md:py-16">
        <div className="flex flex-col gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M12 2L4 6v6c0 5 3.5 9 8 10 4.5-1 8-5 8-10V6l-8-4z" />
            </svg>
          </div>
          <h2 className="text-display-sm text-primary">AI đánh giá uy tín</h2>
          <p className="text-sm text-muted-foreground">
            Mỗi tin được AI phân tích và gắn Trust Score — điểm tham khảo minh
            bạch, không phải xác nhận pháp lý.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M3 12l2-2 7 7 9-9 2 2-11 11-9-9z" />
            </svg>
          </div>
          <h2 className="text-display-sm text-primary">Lọc nội dung spam</h2>
          <p className="text-sm text-muted-foreground">
            Hệ thống duyệt tin trước khi publish — loại tin trùng lặp, sai sự
            thật, lừa đảo. Chỉ tin sạch mới lên sàn.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent/10 text-accent">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <h2 className="text-display-sm text-primary">Mọi khu vực</h2>
          <p className="text-sm text-muted-foreground">
            Tập trung bất động sản khắp Việt Nam — từ thành phố lớn đến khu vực
            đang bùng nổ cơ hội đầu tư.
          </p>
        </div>
      </section>

      {/* CTA footer — đẩy vào browse hoặc đăng tin. */}
      <section className="flex flex-col items-center gap-4 rounded-lg border border-border bg-muted/30 px-6 py-12 text-center md:py-16">
        <h2 className="text-display-sm text-primary">
          Sẵn sàng mua bán bất động sản?
        </h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Đăng tin miễn phí, nhận liên hệ từ người mua thực sự quan tâm.
        </p>
        <Button asChild size="lg" className="min-h-[44px]">
          <Link href="/dashboard/dang-tin">Đăng tin ngay</Link>
        </Button>
      </section>
    </div>
  );
}
