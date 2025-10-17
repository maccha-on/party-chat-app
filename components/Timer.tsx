'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';


type TimerRow = {
  room_id: string;
  label: string;
  running: boolean;
  ends_at: string | null;
  remaining_ms: number;
};


export default function Timer({ roomId }:{ roomId:string }){
const [label, setLabel] = useState('Timer');
const [running, setRunning] = useState(false);
const [endsAt, setEndsAt] = useState<string|null>(null);
const [remainingMs, setRemainingMs] = useState(0);
const [now, setNow] = useState(Date.now());
const audioRef = useRef<HTMLAudioElement|null>(null);


useEffect(()=>{ const i=setInterval(()=>setNow(Date.now()), 200); return ()=>clearInterval(i); },[]);


// 初期取得 + Realtime
useEffect(()=>{
const load = async () => {
const { data } = await supabase.from('timers').select('*').eq('room_id', roomId).maybeSingle();
if (data) { setLabel(data.label); setRunning(data.running); setEndsAt(data.ends_at); setRemainingMs(data.remaining_ms); }
};
load();
const ch = supabase
.channel(`timers:${roomId}`)
.on(
  'postgres_changes',
  { event:'*', schema:'public', table:'timers', filter:`room_id=eq.${roomId}` },
  (payload: RealtimePostgresChangesPayload<TimerRow>)=>{
    const next = payload.new as Partial<TimerRow> | null;
    if (typeof next?.label === 'string') setLabel(next.label);
    if (typeof next?.running === 'boolean') setRunning(next.running);
    if (next && 'ends_at' in next) setEndsAt(next.ends_at ?? null);
    if (typeof next?.remaining_ms === 'number') setRemainingMs(next.remaining_ms);
  }
)
.subscribe();
return ()=>{ supabase.removeChannel(ch); };
},[roomId]);


const left = useMemo(()=>{
if (running && endsAt) return Math.max(0, new Date(endsAt).getTime() - now);
return Math.max(0, remainingMs);
},[running, endsAt, remainingMs, now]);


// 0になった瞬間にゴング
const prevLeft = useRef(left);
useEffect(()=>{
if (prevLeft.current > 0 && left === 0) {
audioRef.current?.play().catch(()=>{});
}
prevLeft.current = left;
},[left]);


const fmt = (ms:number) => {
const s = Math.ceil(ms/1000);
const m = Math.floor(s/60);
const r = s % 60; return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
};


const start = async (sec:number) => {
const end = new Date(Date.now() + sec*1000).toISOString();
await supabase.from('timers').upsert({ room_id: roomId, label: label || 'Timer', running: true, ends_at: end, remaining_ms: sec*1000 });
};
const pause = async () => {
const remain = Math.max(0, (endsAt? new Date(endsAt).getTime(): Date.now()) - Date.now());
await supabase.from('timers').upsert({ room_id: roomId, label: label || 'Timer', running: false, ends_at: null, remaining_ms: remain });
};


return (
<div className="rounded border p-3 bg-white">
<div className="flex items-center justify-between mb-2">
<input value={label} onChange={(e)=>setLabel(e.target.value)} className="px-2 py-1" />
<span className="font-mono text-xl">{fmt(left)}</span>
</div>
<div className="flex flex-wrap gap-2 mb-2">
{[30,60,90,120,180].map(s => (
<button key={s} onClick={()=>start(s)}>{s}s スタート</button>
))}
<button onClick={pause}>一時停止</button>
</div>
<audio ref={audioRef} src="/gong.mp3" preload="auto" />
</div>
);
}