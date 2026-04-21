import { Suspense } from 'react';
import Landing from '@/components/chat/Landing';

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center" style={{ color: 'var(--mute)' }}>
          Loading…
        </main>
      }
    >
      <Landing />
    </Suspense>
  );
}
