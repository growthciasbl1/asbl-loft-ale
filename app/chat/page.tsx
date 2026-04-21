import { Suspense } from 'react';
import ChatView from '@/components/chat/ChatView';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center" style={{ color: 'var(--mute)' }}>
          Loading…
        </main>
      }
    >
      <ChatView />
    </Suspense>
  );
}
