import { ProfileForm } from './profile-form';

// /profile page (AC6) — Story 2.3.
// Server wrapper → client island ProfileForm. AD-4: SSR-able, auth protect
// client-side (accessToken in memory — SSR không biết auth state).
// Route KHÔNG nằm trong (auth) group (group đó cho login/register — profile là
// authenticated page riêng).
export default function ProfilePage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-foreground">
        Hồ sơ của tôi
      </h1>
      <ProfileForm />
    </main>
  );
}
