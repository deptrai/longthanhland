export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold">Về chúng tôi</h1>
      <p className="mb-4 text-lg text-muted-foreground">
        bdsai.vn — Sàn rao vặt bất động sản AI Việt Nam.
      </p>
      <p className="mb-4 text-base text-muted-foreground">
        Nền tảng kết nối người mua và người bán bất động sản khắp Việt Nam,
        với hỗ trợ AI đánh giá uy tín tin đăng và lọc nội dung spam.
      </p>
      <p className="text-base text-muted-foreground">
        Liên hệ: <a href="mailto:contact@bdsai.vn" className="underline">contact@bdsai.vn</a>
      </p>
    </div>
  );
}
