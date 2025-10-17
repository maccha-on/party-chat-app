'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';


export type Member = { id:number; room_id:string; username:string; score:number; role:string; updated_at:string };


export default function UsersPanel({ roomId, me }:{ roomId:string; me:string }){
const [members, setMembers] = useState<Member[]>([]);
const smallButtonClass = 'rounded border border-blue-200 bg-blue-50 px-2 py-1 text-blue-800 transition-colors hover:bg-blue-100 text-sm font-medium';


// 入室処理（upsert）＆ heartbeat（5秒毎）
useEffect(() => {
let alive = true;
const upsertMe = async () => {
await supabase.from('members').upsert({ room_id: roomId, username: me, updated_at: new Date().toISOString() });
};
upsertMe();
const hb = setInterval(()=>{ if (alive) upsertMe(); }, 5000);
const beforeUnload = () => { supabase.from('members').update({ updated_at: new Date(0).toISOString() }).eq('room_id', roomId).eq('username', me); };
window.addEventListener('beforeunload', beforeUnload);


return () => { alive = false; clearInterval(hb); window.removeEventListener('beforeunload', beforeUnload); };
}, [roomId, me]);


// 初期読み込み + Realtime購読
useEffect(() => {
const load = async () => {
const { data } = await supabase.from('members').select('*').eq('room_id', roomId).order('username');
setMembers(data ?? []);
};
load();


const ch = supabase
.channel(`members:${roomId}`)
.on(
  'postgres_changes',
  { event:'*', schema:'public', table:'members', filter:`room_id=eq.${roomId}` },
  (payload: RealtimePostgresChangesPayload<Member>)=>{
    setMembers(prev => {
      if (payload.eventType === 'DELETE' && payload.old) {
        return prev.filter(m=>m.id!==payload.old.id);
      }
      const next = payload.new as Partial<Member> | null;
      if (typeof next?.id !== 'number') return prev;
      const existingIndex = prev.findIndex(m=>m.id===next.id);
      if (existingIndex === -1) {
        return [...prev, next as Member];
      }
      const copy = [...prev];
      copy[existingIndex] = { ...copy[existingIndex], ...next } as Member;
      return copy;
    });
  }
)
.subscribe();
return () => { supabase.removeChannel(ch); };
}, [roomId]);


const adjust = async (u:string, delta:number) => {
const m = members.find(x=>x.username===u);
if (!m) return;
await supabase.from('members').update({ score: m.score + delta }).eq('id', m.id);
};


const online = (m:Member) => Date.now() - new Date(m.updated_at).getTime() < 10000;


const sortedMembers = [...members].sort((a,b)=>a.username.localeCompare(b.username));

return (
<div className="rounded border p-3 bg-white">
<div className="font-semibold mb-2">入室中ユーザー</div>
<ul className="space-y-2">
{sortedMembers.map(m => (
<li key={m.id} className="flex items-center gap-2">
<span className={`w-2 h-2 rounded-full ${online(m)?'bg-green-500':'bg-gray-300'}`} />
<span className="w-28 truncate">{m.username}</span>
<span className="w-10 text-right">{m.score}</span>
<button onClick={()=>adjust(m.username, +1)} className={smallButtonClass}>＋</button>
<button onClick={()=>adjust(m.username, -1)} className={smallButtonClass}>－</button>
<span className="ml-3 text-xs text-gray-500">{m.role}</span>
</li>
))}
</ul>
</div>
);
}