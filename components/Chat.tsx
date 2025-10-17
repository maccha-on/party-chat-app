'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';


type Msg = { id:number; username:string; body:string; created_at:string };


export default function Chat({ roomId, me }:{ roomId:string; me:string }){
const [text, setText] = useState('');
const [items, setItems] = useState<Msg[]>([]);
const bottomRef = useRef<HTMLDivElement>(null);
const inputClass = 'w-full rounded border border-blue-200 bg-blue-50 px-3 py-2 placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200';
const buttonClass = 'rounded border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800 transition-colors hover:bg-blue-100 font-medium';


useEffect(()=>{
const load = async () => {
const { data } = await supabase.from('messages').select('id,username,body,created_at').eq('room_id', roomId).order('created_at',{ascending:true}).limit(300);
setItems(data ?? []);
bottomRef.current?.scrollIntoView({behavior:'smooth'});
};
load();
const ch = supabase
.channel(`messages:${roomId}`)
.on('postgres_changes', { event:'INSERT', schema:'public', table:'messages', filter:`room_id=eq.${roomId}` }, (p:any)=>{
setItems(prev=>[...prev, p.new]); bottomRef.current?.scrollIntoView({behavior:'smooth'});
})
.subscribe();
return ()=>{ supabase.removeChannel(ch); };
},[roomId]);


const send = async () => {
const body = text.trim(); if (!body) return; setText('');
await supabase.from('messages').insert({ room_id: roomId, username: me, body });
};


const onKey = (e:React.KeyboardEvent<HTMLInputElement>)=>{ if (e.key==='Enter') send(); };


return (
<div className="rounded border bg-white">
<div className="p-3 border-b font-semibold">チャット</div>
<div className="p-3 h-[260px] overflow-y-auto space-y-2">
{items.map(m=> (
<div key={m.id} className="text-sm"><span className="font-semibold mr-2">{m.username}</span>{m.body}</div>
))}
<div ref={bottomRef} />
</div>
<div className="p-3 flex gap-2 border-t">
<input value={text} onChange={(e)=>setText(e.target.value)} onKeyDown={onKey} className={inputClass} placeholder="メッセージを入力" />
<button onClick={send} className={buttonClass}>送信</button>
</div>
</div>
);
}