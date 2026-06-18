'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type AdminItem = {
  id: string;
  title: string;
  coverUrl: string | null;
  musicUrl: string | null;
  genre: string | null;
  isPublic: boolean;
  createdAt: string;
  preview: string;
};

const PW_STORAGE_KEY = 'admin-password';

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AdminItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // On mount: if a password is in sessionStorage, try to use it
  useEffect(() => {
    const saved =
      typeof window !== 'undefined'
        ? sessionStorage.getItem(PW_STORAGE_KEY)
        : null;
    if (saved) {
      setPassword(saved);
      tryLogin(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tryLogin(pw: string) {
    setLoading(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/list', {
        method: 'POST',
        headers: { 'x-admin-password': pw },
      });
      if (!res.ok) {
        const { error } = await res
          .json()
          .catch(() => ({ error: 'login failed' }));
        setAuthError(
          res.status === 401 ? 'Wrong password.' : error || 'Login failed.'
        );
        sessionStorage.removeItem(PW_STORAGE_KEY);
        setAuthed(false);
        return;
      }
      const data = await res.json();
      setItems(data.soundtracks ?? []);
      setAuthed(true);
      sessionStorage.setItem(PW_STORAGE_KEY, pw);
    } catch (err) {
      console.error(err);
      setAuthError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    tryLogin(password);
  }

  function logout() {
    sessionStorage.removeItem(PW_STORAGE_KEY);
    setPassword('');
    setAuthed(false);
    setItems([]);
  }

  async function deleteItem(id: string, title: string) {
    if (
      !confirm(
        `Permanently delete "${title}"?\n\nThis removes the row, the audio file, and the cover image. Cannot be undone.`
      )
    ) {
      return;
    }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/delete/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });
      if (!res.ok) {
        alert('Delete failed.');
        return;
      }
      setItems((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleHidden(id: string, currentlyPublic: boolean) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/hide/${id}`, {
        method: 'POST',
        headers: {
          'x-admin-password': password,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublic: !currentlyPublic }),
      });
      if (!res.ok) {
        alert('Update failed.');
        return;
      }
      setItems((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isPublic: !currentlyPublic } : s
        )
      );
    } finally {
      setBusyId(null);
    }
  }

  // -------------------------------------------------------------------------
  // Login screen
  // -------------------------------------------------------------------------
  if (!authed) {
    return (
      <main className="min-h-screen bg-ink flex flex-col items-center justify-center px-6">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-whisper/70">
              Cabinet
            </p>
            <h1 className="font-display italic text-3xl text-paper">admin</h1>
          </div>

          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="w-full bg-transparent border-b border-whisper/40 focus:border-brass text-paper font-sans py-3 outline-none transition-colors"
          />

          {authError && (
            <p className="text-center font-sans text-sm text-red-400">
              {authError}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full inline-flex items-center justify-center font-sans text-xs tracking-[0.3em] uppercase text-paper border border-paper/45 hover:border-brass hover:text-brass transition-colors duration-300 px-7 py-3 rounded-full disabled:opacity-40"
          >
            {loading ? 'checking…' : 'enter'}
          </button>
        </form>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Admin list
  // -------------------------------------------------------------------------
  return (
    <main className="min-h-screen bg-ink px-6 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <p className="font-sans text-[10px] tracking-[0.3em] uppercase text-whisper/70">
              Cabinet
            </p>
            <h1 className="font-display italic text-3xl text-paper">
              admin · {items.length} soundtracks
            </h1>
          </div>
          <button
            onClick={logout}
            className="font-sans text-xs tracking-[0.3em] uppercase text-whisper hover:text-brass transition-colors"
          >
            log out
          </button>
        </div>

        {/* Table */}
        <div className="space-y-2">
          {items.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-4 p-3 rounded border ${
                s.isPublic
                  ? 'border-whisper/15 bg-warmth/40'
                  : 'border-whisper/10 bg-ink opacity-60'
              }`}
            >
              {/* Cover thumb */}
              <div className="w-16 h-16 flex-shrink-0 bg-warmth rounded overflow-hidden">
                {s.coverUrl ? (
                  <img
                    src={s.coverUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>

              {/* Meta */}
              <div className="flex-1 min-w-0">
                <p className="font-serif italic text-paper text-lg truncate">
                  {s.title}
                </p>
                <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-whisper/70 mt-0.5">
                  {s.genre || '—'} · {formatDate(s.createdAt)} ·{' '}
                  {s.isPublic ? 'public' : 'hidden'}
                </p>
                {s.preview && (
                  <p className="font-serif italic text-whisper text-sm mt-1 truncate">
                    {s.preview}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/soundtrack/${s.id}`}
                  target="_blank"
                  className="font-sans text-[10px] tracking-[0.25em] uppercase text-whisper hover:text-brass transition-colors px-3 py-2"
                >
                  view
                </Link>
                <button
                  onClick={() => toggleHidden(s.id, s.isPublic)}
                  disabled={busyId === s.id}
                  className="font-sans text-[10px] tracking-[0.25em] uppercase text-whisper hover:text-brass transition-colors px-3 py-2 disabled:opacity-40"
                >
                  {s.isPublic ? 'hide' : 'show'}
                </button>
                <button
                  onClick={() => deleteItem(s.id, s.title)}
                  disabled={busyId === s.id}
                  className="font-sans text-[10px] tracking-[0.25em] uppercase text-red-400/80 hover:text-red-300 transition-colors px-3 py-2 disabled:opacity-40"
                >
                  delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <p className="text-center font-serif italic text-whisper py-12">
            No soundtracks in the cabinet yet.
          </p>
        )}
      </div>
    </main>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
