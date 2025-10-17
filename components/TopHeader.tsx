'use client';
import Image from 'next/image';


export default function TopHeader({ username, roomName, role }:{ username:string; roomName?:string; role?:string; }){
return (
<div className="flex items-start gap-4 mb-4">
<Image src="/top.png" alt="top" width={120} height={120} className="rounded" />
<div className="text-sm leading-6">
<div>ユーザー名：<span className="font-semibold">{username}</span></div>
{roomName && <div>部屋名：<span className="font-semibold">{roomName}</span></div>}
{role !== undefined && <div>役割：<span className="font-semibold">{role || '未定'}</span></div>}
</div>
</div>
);
}