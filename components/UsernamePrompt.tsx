'use client'
import { useState } from 'react'
import { setNickname } from '@/lib/playerIdentity'

// Shown on the first results screen (any mode) until the player picks a
// username. Once set, every Daily Challenge result is submitted to the global
// leaderboard automatically — so a weak score can't be hidden by skipping it.
export function UsernamePrompt({
  accent = '#34d399', onSaved,
}: {
  accent?: string
  onSaved: (name: string) => void
}) {
  const [name, setName] = useState('')

  function save(e: React.FormEvent) {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setNickname(n)
    onSaved(n)
  }

  return (
    <form
      onSubmit={save}
      className="rounded-2xl border p-5 mb-6"
      style={{ background: accent + '14', borderColor: accent + '55' }}
    >
      <h3 className="text-sm font-black uppercase tracking-widest text-white">Choose your username</h3>
      <p className="text-xs text-slate-300 mt-1.5 mb-3">
        This is your name on the global <span className="font-bold">Daily Challenge</span> leaderboard.
        Once set, your daily results are posted automatically.
      </p>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your username"
          maxLength={24}
          autoFocus
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-white/25"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="rounded-xl px-5 py-2.5 text-sm font-black text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: accent, boxShadow: `0 6px 22px ${accent}44` }}
        >
          Save
        </button>
      </div>
    </form>
  )
}
