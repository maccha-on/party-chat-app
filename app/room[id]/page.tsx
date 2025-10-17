'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUsername } from '@/lib/useUsername';
import TopHeader from '@/components/TopHeader';
import UsersPanel from '@/components/UsersPanel';
import Timer from '@/components/Timer';
import Roles from '@/components/Roles';
import TopicButtons from '@/components/TopicButtons';
import Chat from '@/components/Chat';
import { supabase } from '@/lib/supabaseClient';


export default function RoomPage(){
const { id } = useParams<{id:string}>();
const { username } = useUsername();
const router = useRouter();
const [myRole, setMyRole] = useState('未定');


useEffect(()=>{ if (!username) router.replace('/login'); },[username, router]);


useEffect(()=>{
const loadMyRole = async () => {
if (!username) return;
const { data } = await supabase.from('members').select('role').eq('room_id', String(id)).eq('username', username).maybeSingle();
if (data) setMyRole(data.role);
};
loadMyRole();
const ch = supabase
.channel(`members:${id}:me`)
.on('postgres_changes', { event:'*', schema:'public', table:'members', filter:`room_id=eq.${id},username=eq.${username}` }, (p:any)=>{ setMyRole(p.new.role); })
.subscribe();
return ()=>{ supabase.removeChannel(ch); };
},[id, username]);


if (!username) return null;
const roomName = String(id);


return (
<main className="mx-auto max-w-5xl p-4 space-y-4">
<TopHeader username={username} roomName={roomName} role={myRole} />
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<div className="md:col-span-2 space-y-4">
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