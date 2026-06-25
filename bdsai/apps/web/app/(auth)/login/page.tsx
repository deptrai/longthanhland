import { Suspense } from 'react';
import { LoginForm } from './login-form';

// Login page (AC8) — server component wrapper → LoginForm (client).
// AD-10: ZERO business logic trong web — validation nghiệp vụ ở NestJS.
// Suspense boundary required cho useSearchParams() (Next.js 16 CSR bailout).
export default function LoginPage() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Đăng nhập
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Đăng nhập để quản lý tin đăng và hồ sơ
        </p>
      </div>
      <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Đang tải...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
