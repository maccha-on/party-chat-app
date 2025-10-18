'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { tryGetSupabaseClient } from '@/lib/supabaseClient';

type Msg = { id: number; username: string; body: string; created_at: string };
type MessageRow = Msg & { room_id: string };

const buttonClass = 'rounded border border-blue-200 bg-blue-50 text-blue-800 transition-colors hover:bg-blue-100';

export default function Chat({ roomId, me }: { roomId: string; me: string }) {
  const [text, setText] = useState('');
  const [items, setItems] = useState<Msg[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = tryGetSupabaseClient();
  const storageKey = useMemo(() => `party-chat-messages:${roomId}`, [roomId]);

  const writeLocalMessages = useCallback((next: Msg[]) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // noop
    }
  }, [storageKey]);

  const readLocalMessages = useCallback((): Msg[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Msg[] | null;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item): item is Msg => {
          return (
            !!item &&
            typeof item.id === 'number' &&
            typeof item.username === 'string' &&
            typeof item.body === 'string' &&
            typeof item.created_at === 'string'
          );
        })
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
    } catch {
      return [];
    }
  }, [storageKey]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('id,username,body,created_at')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
        .limit(300);
      if (!active) return;
      setItems(data ?? []);
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    void load();

    const interval = setInterval(() => {
      void load();
    }, 1000);
    const ch = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload: RealtimePostgresChangesPayload<MessageRow>) => {
          const next = payload.new as Partial<MessageRow> | null;
          if (
            !next ||
            typeof next.id !== 'number' ||
            typeof next.username !== 'string' ||
            typeof next.body !== 'string' ||
            typeof next.created_at !== 'string'
          ) {
            return;
          }
          const msg: Msg = {
            id: next.id,
            username: next.username,
            body: next.body,
            created_at: next.created_at,
          };
          setItems((prev) => [...prev, msg]);
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        },
      )
      .subscribe();
    return () => {
      active = false;
      clearInterval(interval);
      supabase.removeChannel(ch);
    };
  }, [roomId, supabase]);

  useEffect(() => {
    if (supabase) return;
    const sync = () => {
      setItems(readLocalMessages());
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    sync();
    const storageListener = (event: StorageEvent) => {
      if (event.key === storageKey) {
        sync();
      }
    };
    window.addEventListener('storage', storageListener);
    return () => {
      window.removeEventListener('storage', storageListener);
    };
  }, [readLocalMessages, storageKey, supabase]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    if (!supabase) {
      setItems((prev) => {
        const updated = [
          ...prev,
          { id: Date.now(), username: me, body, created_at: new Date().toISOString() },
        ];
        writeLocalMessages(updated);
        return updated;
      });
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    await supabase.from('messages').insert({ room_id: roomId, username: me, body });
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') send();
  };

  return (
    <div className="rounded border bg-white">
      <div className="border-b p-3 font-semibold">チャット</div>
      <div className="h-[260px] space-y-2 overflow-y-auto p-3">
        {items.map((m) => (
          <div key={m.id} className="text-sm">
            <span className="mr-2 font-semibold">{m.username}</span>
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 border-t p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          className="w-full rounded border border-blue-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
          placeholder="メッセージを入力"
        />
        <button onClick={send} className={`${buttonClass} whitespace-nowrap px-4 py-2`}>
          送信
        </button>
      </div>
    </div>
  );
}
