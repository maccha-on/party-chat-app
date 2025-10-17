'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import Chat from '@/components/Chat';
import Roles from '@/components/Roles';
import Timer from '@/components/Timer';
import TopicButtons from '@/components/TopicButtons';
import TopHeader from '@/components/TopHeader';
import UsersPanel from '@/components/UsersPanel';
import { supabase } from '@/lib/supabaseClient';
import { useUsername } from '@/lib/useUsername';

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const { username, isLoaded } = useUsername();
  const router = useRouter();
  const [myRole, setMyRole] = useState('未定');

  useEffect(() => {
    if (!isLoaded) return;
    if (!username) router.replace('/login');
  }, [username, router, isLoaded]);

  useEffect(() => {
    if (!username) return;

    const loadMyRole = async () => {
      const { data } = await supabase
        .from('members')
        .select('role')
        .eq('room_id', String(id))
        .eq('username', username)
        .maybeSingle();

      if (data?.role) setMyRole(data.role);
    };

    loadMyRole();

    const channel = supabase
      .channel(`members:${id}:me`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'members', filter: `room_id=eq.${id},username=eq.${username}` },
        (payload: RealtimePostgresChangesPayload<{ role: string }>) => {
          const next = payload.new as { role?: string } | null;
          if (next?.role) setMyRole(next.role);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, username]);

  if (!isLoaded) return null;
  if (!username) return null;

  const roomName = String(id);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4">
      <TopHeader username={username} roomName={roomName} role={myRole} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-2">
          <UsersPanel roomId={roomName} me={username} />
          <Timer roomId={roomName} />
          <Roles roomId={roomName} me={username} />
          <TopicButtons roomId={roomName} myRole={myRole} />
          <Chat roomId={roomName} me={username} />
        </div>
      </div>
    </main>
  );
}
