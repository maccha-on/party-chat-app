'use client';

import Image from 'next/image';

type Props = {
  username: string;
  roomName?: string;
  role?: string;
};

export default function TopHeader({ username, roomName, role }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start">
      <Image src="/top.png" alt="top" width={240} height={240} className="rounded" />
      <div className="text-sm leading-6">
        <div>
          ユーザー名：<span className="font-semibold">{username}</span>
        </div>
        {roomName && (
          <div>
            部屋名：<span className="font-semibold">{roomName}</span>
          </div>
        )}
        {role !== undefined && (
          <div>
            役割：<span className="font-semibold">{role || '未定'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
