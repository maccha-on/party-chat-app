'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useUsername } from '@/lib/useUsername';

const buttonClass =
  'rounded border border-blue-200 bg-blue-50 text-blue-800 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50';
const inputClass =
  'w-full rounded border border-blue-200 bg-blue-50 px-3 py-2 placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200';

export default function Login() {
  const [name, setName] = useState('');
  const { save } = useUsername();
  const router = useRouter();

  const enter = () => {
    const n = name.trim();
    if (!n) return;
    save(n);
    router.push('/');
  };

  return (
    <main className="mx-auto max-w-xl space-y-6 p-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <Image src="/top.png" alt="top" width={240} height={240} className="rounded" />
        <h1 className="text-2xl font-bold">入室</h1>
      </div>
      <div className="space-y-2">
        <label className="block text-sm">ユーザー名</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: たろう"
          className={inputClass}
        />
      </div>
      <button onClick={enter} className={`w-full px-3 py-2 font-medium ${buttonClass}`}>
        入室する
      </button>
    </main>
  );
}
