// Placeholder cho API client (BFF → NestJS). Story 1.2+ sẽ cấu hình base URL,
// forward Bearer token. AD-10: app/api chỉ là proxy mỏng, ZERO business logic.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3101';
