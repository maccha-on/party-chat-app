'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { Member } from './UsersPanel';


export default function Roles({ roomId, me }:{ roomId:string; me:string }){
const [revealed, setRevealed] = useState(false);
const [myRole, setMyRole] = useState('未定');
const buttonClass = 'rounded border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800 transition-colors hover:bg-blue-100 text-sm font-medium';


// roles_state と自分の役割を追従
useEffect(()=>{
const init = async () => {
const { data: rs } = await supabase.from('roles_state').select('revealed').eq('room_id', roomId).maybeSingle();
if (rs) setRevealed(rs.revealed);
const { data: meRec } = await supabase.from('members').select('role').eq('room_id', roomId).eq('username', me).maybeSingle();
if (meRec) setMyRole(meRec.role);
};
init();


const ch1 = supabase
.channel(`roles_state:${roomId}`)
.on('postgres_changes', { event:'*', schema:'public', table:'roles_state', filter:`room_id=eq.${roomId}` }, (p:any)=>{
setRevealed(p.new.revealed);
})
.subscribe();


const ch2 = supabase
.channel(`members-role:${roomId}`)
.on('postgres_changes', { event:'*', schema:'public', table:'members', filter:`room_id=eq.${roomId},username=eq.${me}` }, (p:any)=>{
setMyRole(p.new.role);
})
.subscribe();


return ()=>{ supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
},[roomId, me]);


// 役割決め：オンライン（10秒以内更新）メンバーに 1人ずつ割当
const assignRoles = async () => {
const { data: list } = await supabase.from('members').select('*').eq('room_id', roomId);
const online = (list||[]).filter(m => Date.now() - new Date(m.updated_at).getTime() < 10000);
if (online.length < 2) return; // 安全策
// クリア
await supabase.from('members').update({ role: '未定' }).eq('room_id', roomId);
// ランダム抽選
const idxIn = Math.floor(Math.random()*online.length);
let idxMa = Math.floor(Math.random()*online.length);
while (idxMa === idxIn) idxMa = Math.floor(Math.random()*online.length);
const insider = online[idxIn].username;
const master = online[idxMa].username;
await supabase.from('members').update({ role: 'インサイダー' }).eq('room_id', roomId).eq('username', insider);
await supabase.from('members').update({ role: 'マスター' }).eq('room_id', roomId).eq('username', master);
await supabase.from('members').update({ role: '庶民' }).eq('room_id', roomId).neq('username', insider).neq('username', master).eq('room_id', roomId);
await supabase.from('roles_state').upsert({ room_id: roomId, revealed: false });
};


const revealRoles = async () => {
await supabase.from('roles_state').upsert({ room_id: roomId, revealed: true });
};


return (
<div className="rounded border p-3 bg-white">
<div className="font-semibold mb-2">役割</div>
<div className="flex gap-2 mb-2">
<button onClick={assignRoles} className={buttonClass}>役割決め</button>
<button onClick={revealRoles} className={buttonClass}>役割開示</button>
</div>
<div className="text-sm">あなたの役割：<span className="font-semibold">{myRole || '未定'}</span>{revealed ? '（全体に開示中）' : ''}</div>
</div>
);
}