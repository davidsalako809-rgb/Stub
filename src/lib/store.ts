// Local-only storage. Nothing leaves the device except what the user sends on-chain.
import type { StubEvent, Chain } from './event'

export interface SavedTicket {
  hash: string
  chain: Chain
  qty: number
  holder: string // sender address
  event: StubEvent
  bought: number
  confirmed?: boolean
}

export interface CheckIn { hash: string; qty: number; from: string; at: number }

const K = {
  events: 'stub:events',
  tickets: 'stub:tickets',
  checkins: (id: string) => `stub:checkins:${id}`,
  demo: 'stub:demo',
}

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* storage full or blocked */ }
}

export const store = {
  myEvents(): StubEvent[] { return read<StubEvent[]>(K.events, []) },
  saveEvent(e: StubEvent) {
    const list = store.myEvents().filter((x) => x.id !== e.id)
    write(K.events, [e, ...list])
  },
  removeEvent(id: string) { write(K.events, store.myEvents().filter((x) => x.id !== id)) },
  getEvent(id: string) { return store.myEvents().find((e) => e.id === id) },

  tickets(): SavedTicket[] { return read<SavedTicket[]>(K.tickets, []) },
  saveTicket(t: SavedTicket) {
    const list = store.tickets().filter((x) => x.hash !== t.hash)
    write(K.tickets, [t, ...list])
  },
  getTicket(hash: string) { return store.tickets().find((t) => t.hash === hash) },

  checkins(eventId: string): CheckIn[] { return read<CheckIn[]>(K.checkins(eventId), []) },
  addCheckin(eventId: string, c: CheckIn) {
    write(K.checkins(eventId), [c, ...store.checkins(eventId).filter((x) => x.hash !== c.hash)])
  },
  undoCheckin(eventId: string, hash: string) {
    write(K.checkins(eventId), store.checkins(eventId).filter((x) => x.hash !== hash))
  },

  demo(): boolean { return read<boolean>(K.demo, false) },
  setDemo(on: boolean) { write(K.demo, on) },
}
