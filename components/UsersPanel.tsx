'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';


export type Member = { id:number; room_id:string; username:string; score:number; role:string; updated_at:string };


export default function UsersPanel({ roomId, me }:{ roomId:string; me:string }){
const [members, setMembers] = useState<Member[]>([]);


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
.on('postgres_changes', { event:'*', schema:'public', table:'members', filter:`room_id=eq.${roomId}` }, (payload:any)=>{
setMembers(prev => {
const rec = payload.new ?? payload.old;
if (payload.eventType === 'DELETE') return prev.filter(m=>m.id!==rec.id);
const i = prev.findIndex(m=>m.id===rec.id);
if (i === -1) return [...prev, payload.new];
const copy = [...prev]; copy[i] = payload.new; return copy;
});
})
.subscribe();
return () => { supabase.removeChannel(ch); };
}, [roomId]);


const adjust = async (u:string, delta:number) => {
const m = members.find(x=>x.username===u);
if (!m) return;
await supabase.from('members').update({ score: m.score + delta }).eq('id', m.id);
};


const online = (m:Member) => Date.now() - new Date(m.updated_at).getTime() < 10000;


return (
<div className="rounded border p-3 bg-white">
<div className="font-semibold mb-2">入室中ユーザー</div>
<ul className="space-y-2">
{members.sort((a,b)=>a.username.localeCompare(b.username)).map(m => (
<li key={m.id} className="flex items-center gap-2">
<span className={`w-2 h-2 rounded-full ${online(m)?'bg-green-500':'bg-gray-300'}`} />
<span className="w-28 truncate">{m.username}</span>
<span className="w-10 text-right">{m.score}</span>
<button onClick={()=>adjust(m.username, +1)}>＋</button>
<button onClick={()=>adjust(m.username, -1)}>－</button>
<span className="ml-3 text-xs text-gray-500">{m.role}</span>
</li>
))}
</ul>
</div>
);
}