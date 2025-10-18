'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { tryGetSupabaseClient } from '@/lib/supabaseClient';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type Member = { id: number; room_id: string; username: string; score: number; role: string; updated_at: string };

const buttonClass = 'rounded border border-blue-200 bg-blue-50 text-blue-800 transition-colors hover:bg-blue-100';

export default function UsersPanel({ roomId, me }: { roomId: string; me: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const supabase = tryGetSupabaseClient();

  const storageKey = useMemo(() => `party-chat-members:${roomId}`, [roomId]);

  const writeLocalMembers = useCallback((next: Member[]) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // ignore storage write failures
    }
  }, [storageKey]);

  const readLocalMembers = useCallback((): Member[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Member[] | null;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item): item is Member => {
          return (
            !!item &&
            typeof item.username === 'string' &&
            typeof item.room_id === 'string' &&
            typeof item.score === 'number' &&
            typeof item.updated_at === 'string'
          );
        })
        .sort((a, b) => a.username.localeCompare(b.username));
    } catch {
      return [];
    }
  }, [storageKey]);

  // 入室処理（upsert）＆ heartbeat（5秒毎）
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    const upsertMe = async () => {
      await supabase.from('members').upsert({ room_id: roomId, username: me, updated_at: new Date().toISOString() });
    };
    upsertMe();
    const hb = setInterval(() => {
      if (alive) upsertMe();
    }, 5000);
    const beforeUnload = () => {
      supabase.from('members').update({ updated_at: new Date(0).toISOString() }).eq('room_id', roomId).eq('username', me);
    };
    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      alive = false;
      clearInterval(hb);
      window.removeEventListener('beforeunload', beforeUnload);
    };
  }, [roomId, me, supabase]);

  // 初期読み込み + Realtime購読
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const load = async () => {
      const { data } = await supabase.from('members').select('*').eq('room_id', roomId).order('username');
      if (!active) return;
      setMembers(data ?? []);
    };
    void load();

    const interval = setInterval(() => {
      void load();
    }, 1000);

    const ch = supabase
      .channel(`members:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `room_id=eq.${roomId}` },
        (payload: RealtimePostgresChangesPayload<Member>) => {
          setMembers((prev) => {
            if (payload.eventType === 'DELETE' && payload.old) {
              return prev.filter((m) => m.id !== payload.old.id);
            }
            const next = payload.new as Partial<Member> | null;
            if (typeof next?.id !== 'number') return prev;
            const existingIndex = prev.findIndex((m) => m.id === next.id);
            if (existingIndex === -1) {
              return [...prev, next as Member];
            }
            const copy = [...prev];
            copy[existingIndex] = { ...copy[existingIndex], ...next } as Member;
            return copy;
          });
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
    const nowIso = new Date().toISOString();
    const existing = readLocalMembers().filter((item): item is Member =>
      !!item && typeof item.username === 'string',
    );
    const others = existing.filter((m) => m.username !== me);
    const localMember: Member = {
      id: Date.now(),
      room_id: roomId,
      username: me,
      score: 0,
      role: '',
      updated_at: nowIso,
    };
    const initialMembers = [...others, localMember];
    setMembers(initialMembers);
    writeLocalMembers(initialMembers);
    const sync = () => {
      setMembers(readLocalMembers());
    };
    const storageListener = (event: StorageEvent) => {
      if (event.key === storageKey) {
        sync();
      }
    };
    window.addEventListener('storage', storageListener);
    const heartbeat = setInterval(() => {
      setMembers((prev) => {
        const updated = prev.map((m) =>
          m.username === me ? { ...m, updated_at: new Date().toISOString() } : m,
        );
        writeLocalMembers(updated);
        return updated;
      });
    }, 5000);
    sync();
    return () => {
      window.removeEventListener('storage', storageListener);
      clearInterval(heartbeat);
      const remaining = readLocalMembers().filter((m) => m.username !== me);
      writeLocalMembers(remaining);
    };
  }, [me, readLocalMembers, roomId, storageKey, supabase, writeLocalMembers]);

  const adjust = async (u: string, delta: number) => {
    const m = members.find((x) => x.username === u);
    if (!m) return;
    if (!supabase) {
      const updated = members.map((member) =>
        member.username === u ? { ...member, score: member.score + delta } : member,
      );
      setMembers(updated);
      writeLocalMembers(updated);
      return;
    }
    await supabase.from('members').update({ score: m.score + delta }).eq('id', m.id);
  };

  const online = (m: Member) => Date.now() - new Date(m.updated_at).getTime() < 10000;

  const sortedMembers = [...members].sort((a, b) => a.username.localeCompare(b.username));

  return (
    <div className="rounded border bg-white p-3">
      <div className="mb-2 font-semibold">入室中ユーザー</div>
      <ul className="space-y-2">
        {sortedMembers.map((m) => (
          <li key={m.id} className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${online(m) ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="w-28 truncate">{m.username}</span>
            <span className="w-10 text-right">{m.score}</span>
            <button onClick={() => adjust(m.username, +1)} className={`${buttonClass} px-2 py-1 text-sm`}>
              ＋
            </button>
            <button onClick={() => adjust(m.username, -1)} className={`${buttonClass} px-2 py-1 text-sm`}>
              －
            </button>
            <span className="ml-3 text-xs text-gray-500">{m.role}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
