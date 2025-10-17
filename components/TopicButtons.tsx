'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';


type TopicStateRow = {
  room_id: string;
  level: string;
  word: string | null;
};


export default function TopicButtons({ roomId, myRole }:{ roomId:string; myRole:string }){
const [level, setLevel] = useState('normal');
const [word, setWord] = useState<string|undefined>('');
const buttonClass = 'rounded border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800 transition-colors hover:bg-blue-100 text-sm font-medium';


useEffect(()=>{
const load = async () => {
const { data } = await supabase.from('topic_state').select('*').eq('room_id', roomId).maybeSingle();
if (data) { setLevel(data.level); setWord(data.word ?? ''); }
};
load();
const ch = supabase
.channel(`topic:${roomId}`)
.on(
  'postgres_changes',
  { event:'*', schema:'public', table:'topic_state', filter:`room_id=eq.${roomId}` },
  (payload: RealtimePostgresChangesPayload<TopicStateRow>)=>{
    const next = payload.new as Partial<TopicStateRow> | null;
    if (typeof next?.level === 'string') setLevel(next.level);
    if (next && 'word' in next) setWord(next.word ?? '');
  }
)
.subscribe();
return ()=>{ supabase.removeChannel(ch); };
},[roomId]);


const pick = async (which:'normal'|'hard'|'expert') => {
const path = which==='normal'? '/normal.json' : which==='hard'? '/hard.json' : '/expert.json';
const res = await fetch(path);
const arr: string[] = await res.json();
const w = arr[Math.floor(Math.random() * arr.length)];
await supabase.from('topic_state').upsert({ room_id: roomId, level: which, word: w });
};


const canSee = myRole === 'インサイダー' || myRole === 'マスター';


return (
<div className="rounded border p-3 bg-white">
<div className="font-semibold mb-2">お題</div>
<div className="flex flex-wrap gap-2 mb-2">
<button onClick={()=>pick('normal')} className={buttonClass}>普通</button>
<button onClick={()=>pick('hard')} className={buttonClass}>辛口</button>
<button onClick={()=>pick('expert')} className={buttonClass}>激辛</button>
</div>
<div className="text-sm">
{canSee ? (
<span>現在のお題：<span className="font-semibold">{word || '（未選択）'}</span>（{level}）</span>
) : (
<span className="text-gray-500">お題はインサイダー/マスターのみ表示</span>
)}
</div>
</div>
);
}