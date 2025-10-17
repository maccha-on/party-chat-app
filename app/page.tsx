'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useUsername } from '@/lib/useUsername';

export default function Home() {
  const { username, logout, isLoaded } = useUsername();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!username) router.replace('/login');
  }, [username, router, isLoaded]);

  const rooms = Array.from({ length: 10 }, (_, i) => `room${i + 1}`);

  if (!isLoaded) return null;
  if (!username) return null;

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Image src="/top.png" alt="top" width={120} height={120} className="rounded" />
        <div className="text-sm">
          ユーザー名：<span className="font-semibold">{username}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {rooms.map((room) => (
          <Link key={room} href={`/room/${room}`} className="px-3 py-3 text-center">
            {room} に入室
          </Link>
        ))}
      </div>

      <div className="flex justify-end">
        <button onClick={logout}>ログアウト</button>
      </div>
    </main>
  );
}
