'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { tryGetSupabaseClient } from '@/lib/supabaseClient';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type TimerRow = {
  room_id: string;
  label: string;
  running: boolean;
  ends_at: string | null;
  remaining_ms: number;
};

const buttonClass = 'rounded border border-blue-200 bg-blue-50 text-blue-800 transition-colors hover:bg-blue-100';

export default function Timer({ roomId }: { roomId: string }) {
  const [running, setRunning] = useState(false);
  const [endsAt, setEndsAt] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [minuteInput, setMinuteInput] = useState('3');
  const [secondInput, setSecondInput] = useState('00');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const supabase = tryGetSupabaseClient();

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(i);
  }, []);

  // 初期取得 + Realtime
  const syncInputs = useCallback((ms: number) => {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    setMinuteInput(String(mins));
    setSecondInput(String(secs).padStart(2, '0'));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const load = async () => {
      const { data } = await supabase.from('timers').select('*').eq('room_id', roomId).maybeSingle();
      if (data) {
        setRunning(data.running);
        setEndsAt(data.ends_at);
        setRemainingMs(data.remaining_ms);
        syncInputs(data.remaining_ms);
      }
    };
    load();
    const ch = supabase
      .channel(`timers:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'timers', filter: `room_id=eq.${roomId}` },
        (payload: RealtimePostgresChangesPayload<TimerRow>) => {
          const next = payload.new as Partial<TimerRow> | null;
          if (typeof next?.running === 'boolean') setRunning(next.running);
          if (next && 'ends_at' in next) setEndsAt(next.ends_at ?? null);
          if (typeof next?.remaining_ms === 'number') {
            setRemainingMs(next.remaining_ms);
            syncInputs(next.remaining_ms);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId, supabase, syncInputs]);

  const left = useMemo(() => {
    if (running && endsAt) return Math.max(0, new Date(endsAt).getTime() - now);
    return Math.max(0, remainingMs);
  }, [running, endsAt, remainingMs, now]);

  // 0になった瞬間にゴング
  const prevLeft = useRef(left);
  useEffect(() => {
    if (prevLeft.current > 0 && left === 0) {
      audioRef.current?.play().catch(() => {});
    }
    prevLeft.current = left;
  }, [left]);

  const fmt = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };

  const commitTimer = useCallback(
    async (next: { running: boolean; ends_at: string | null; remaining_ms: number }) => {
      if (supabase) {
        await supabase.from('timers').upsert({ room_id: roomId, label: 'Timer', ...next });
      }
      setRunning(next.running);
      setEndsAt(next.ends_at);
      setRemainingMs(next.remaining_ms);
      syncInputs(next.remaining_ms);
    },
    [roomId, supabase, syncInputs],
  );

  const startTimer = useCallback(
    async (totalSeconds: number) => {
      const seconds = Math.max(0, Math.floor(totalSeconds));
      if (seconds === 0) {
        await commitTimer({ running: false, ends_at: null, remaining_ms: 0 });
        return;
      }
      const ms = seconds * 1000;
      const end = new Date(Date.now() + ms).toISOString();
      await commitTimer({ running: true, ends_at: end, remaining_ms: ms });
    },
    [commitTimer],
  );

  const pause = useCallback(async () => {
    const remain = running && endsAt ? Math.max(0, new Date(endsAt).getTime() - Date.now()) : remainingMs;
    await commitTimer({ running: false, ends_at: null, remaining_ms: remain });
  }, [commitTimer, endsAt, remainingMs, running]);

  const handleMinutesChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 3);
    setMinuteInput(digits);
  };

  const handleSecondsChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 2);
    setSecondInput(digits);
  };

  const normalizeTotalSeconds = () => {
    const minutes = Number.parseInt(minuteInput || '0', 10);
    const seconds = Number.parseInt(secondInput || '0', 10);
    const safeMinutes = Number.isNaN(minutes) ? 0 : minutes;
    const safeSeconds = Number.isNaN(seconds) ? 0 : seconds;
    return Math.max(0, safeMinutes * 60 + safeSeconds);
  };

  const startFromInputs = async () => {
    const totalSeconds = normalizeTotalSeconds();
    await startTimer(totalSeconds);
  };

  const onManualKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void startFromInputs();
    }
  };

  const applyPreset = async (minutes: number) => {
    setMinuteInput(String(minutes));
    setSecondInput('00');
    await startTimer(minutes * 60);
  };

  return (
    <div className="rounded border bg-white p-3">
      <div className="mb-4 flex flex-col items-center gap-1 text-blue-800">
        <span className="text-xs text-blue-600">残り時間</span>
        <span className="font-mono text-2xl">{fmt(left)}</span>
      </div>
      <div className="mb-3 flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col text-blue-800">
          <span className="text-xs text-blue-600">分</span>
          <input
            value={minuteInput}
            onChange={(e) => handleMinutesChange(e.target.value)}
            onKeyDown={onManualKeyDown}
            inputMode="numeric"
            pattern="\\d*"
            className="w-20 rounded border border-blue-200 bg-blue-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="0"
          />
        </label>
        <label className="flex flex-col text-blue-800">
          <span className="text-xs text-blue-600">秒</span>
          <input
            value={secondInput}
            onChange={(e) => handleSecondsChange(e.target.value)}
            onKeyDown={onManualKeyDown}
            inputMode="numeric"
            pattern="\\d*"
            className="w-20 rounded border border-blue-200 bg-blue-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="00"
          />
        </label>
        <button onClick={() => void startFromInputs()} className={`${buttonClass} px-3 py-2 text-sm`}>
          スタート
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void applyPreset(3)} className={`${buttonClass} px-3 py-2 text-sm`}>
          3分
        </button>
        <button onClick={() => void applyPreset(6)} className={`${buttonClass} px-3 py-2 text-sm`}>
          6分
        </button>
        <button onClick={() => void applyPreset(10)} className={`${buttonClass} px-3 py-2 text-sm`}>
          10分
        </button>
        <button onClick={() => void pause()} className={`${buttonClass} px-3 py-2 text-sm`}>
          一時停止
        </button>
      </div>
      <audio ref={audioRef} src="/gong.mp3" preload="auto" />
    </div>
  );
}
