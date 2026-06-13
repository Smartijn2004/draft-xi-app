import type { Player, Position } from './types'

// Which specific player positions each formation slot label accepts.
// CM is flexible (central mids interchangeable); wings and ST are strict.
export const SLOT_ACCEPTS: Record<string, string[]> = {
  GK:  ['GK'],
  LB:  ['LB', 'LWB'],
  CB:  ['CB'],
  RB:  ['RB', 'RWB'],
  LWB: ['LWB', 'LB'],
  RWB: ['RWB', 'RB'],
  DM:  ['DM', 'CM'],
  CM:  ['CM', 'DM', 'AM'],
  AM:  ['AM', 'CM'],
  LM:  ['LM', 'LW'],
  RM:  ['RM', 'RW'],
  LW:  ['LW', 'LM'],
  RW:  ['RW', 'RM'],
  ST:  ['ST'],
}

// Broad position each slot label belongs to (for the no-altPositions fallback).
const SLOT_BROAD: Record<string, Position> = {
  GK: 'GK',
  LB: 'DEF', RB: 'DEF', CB: 'DEF', LWB: 'DEF', RWB: 'DEF',
  DM: 'MID', CM: 'MID', AM: 'MID', LM: 'MID', RM: 'MID',
  LW: 'FWD', RW: 'FWD', ST: 'FWD',
}

// Can this player fill the given formation slot label? Uses altPositions when
// present, otherwise falls back to a broad-position match.
export function canFillSlotLabel(player: Player, slotLabel: string): boolean {
  if (player.altPositions?.length) {
    const accepted = SLOT_ACCEPTS[slotLabel] ?? [slotLabel]
    return player.altPositions.some(p => accepted.includes(p))
  }
  return player.position === (SLOT_BROAD[slotLabel] ?? player.position)
}
