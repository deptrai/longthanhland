# bdsai.vn — Monorepo

Sàn rao vặt bất động sản AI cho Long Thành. Monorepo Turborepo (Story 1.1).

## Cấu trúc

```
bdsai/
├── apps/
│   ├── web/      # Next.js 16 + React 19 + Tailwind 4 (Presentation) — cổng 3100
│   └── api/      # NestJS 11 (Application) — cổng 3101
├── packages/
│   └── shared/   # @bdsai/shared — type/schema/constant dùng chung FE↔BE
├── supabase/     # Supabase local (Data) — dải port 5435x
├── turbo.json
├── tsconfig.base.json
└── package.json  # workspace root (yarn 4)
```

## Lệnh

```bash
yarn install      # cài deps toàn workspace
yarn dev          # chạy đồng thời web (3100) + api (3101)
yarn build        # build shared → api → web
yarn lint         # lint cả workspace
yarn typecheck    # typecheck cả workspace
yarn test         # chạy test (api unit)
```

## Cổng dịch vụ

| Dịch vụ | Cổng |
|---|---|
| Web (Next.js) | 3100 |
| API (NestJS) | 3101 |
| Supabase API (kong) | 54351 |
| Supabase DB (postgres) | 54352 |
| Supabase Studio | 54353 |
| Supabase Inbucket | 54354 |
| Supabase Analytics | 54357 |

> Lưu ý port Supabase: quyết định hạ tầng ban đầu là dải 5434x, nhưng tại thời
> điểm scaffold dải 5434x đã bị một project Supabase khác (`epsilon-local`)
> chiếm. Để giữ đúng *ý định* tránh xung đột, bdsai chuyển sang dải **5435x**
> (đang trống). Ghi nhận trong `supabase/config.toml`.

## Supabase

```bash
cd bdsai
supabase start    # khởi động stack local (Docker)
supabase status   # xác nhận port
supabase stop     # dừng, giải phóng tài nguyên
```

Story 1.1 chỉ `supabase init` + `start` (chưa tạo bảng nghiệp vụ — thuộc Story 1.2).
