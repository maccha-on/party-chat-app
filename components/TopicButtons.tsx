'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';


export default function TopicButtons({ roomId, myRole }:{ roomId:string; myRole:string }){
const [level, setLevel] = useState('normal');
const [word, setWord] = useState<string|undefined>('');


useEffect(()=>{
const load = async () => {
const { data } = await supabase.from('topic_state').select('*').eq('room_id', roomId).maybeSingle();
if (data) { setLevel(data.level); setWord(data.word ?? ''); }
};
load();
const ch = supabase
.channel(`topic:${roomId}`)
.on('postgres_changes', { event:'*', schema:'public', table:'topic_state', filter:`room_id=eq.${roomId}` }, (p:any)=>{
setLevel(p.new.level); setWord(p.new.word);
})
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
<button onClick={()=>pick('normal')}>普通</button>
<button onClick={()=>pick('hard')}>辛口</button>
<button onClick={()=>pick('expert')}>激辛</button>
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