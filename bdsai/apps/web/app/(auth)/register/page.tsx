import { RegisterForm } from './register-form';

// Register page (AC6) — server component wrapper → RegisterForm (client).
// AD-10: ZERO business logic trong web — validation nghiệp vụ ở NestJS.
export default function RegisterPage() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Đăng ký tài khoản
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tạo tài khoản để đăng tin hoặc liên hệ seller
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
