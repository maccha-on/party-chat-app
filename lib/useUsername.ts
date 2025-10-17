'use client';
import { useEffect, useState } from 'react';


export function useUsername() {
const [username, setUsername] = useState<string>('');
useEffect(() => { setUsername(localStorage.getItem('username') || ''); }, []);
const save = (name: string) => { localStorage.setItem('username', name); setUsername(name); };
const logout = () => { localStorage.removeItem('username'); setUsername(''); };
return { username, save, logout };
}