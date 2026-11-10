// Read-only chain queries. No wallet prompts: these go to public RPC servers.
// Nimiq: open servers listed at nimiq.dev/rpc/open-servers. Polygon: publicnode.
import type { Network } from './event'
import { demoLedger } from './demo'
import { store } from './store'

const NIM_RPC: Record<Network, string[]> = {
  mainnet: ['https://rpc.nimiqwatch.com'],
  testnet: ['https://rpc.testnet.nimiqwatch.com'],
}
const POLYGON_RPC = ['https://polygon-bor-rpc.publicnode.com', 'https://polygon-rpc.com']

export interface NimTx {
  hash: string
  blockNumber: number
  timestamp: number
  confirmations: number
  from: string
  to: string
  value: number // Luna
  fee: number
  recipientData: string // hex
  executionResult: boolean
}

export class RpcError extends Error {}

async function post(urls: string[], method: string, params: unknown[]): Promise<any> {
  let last: unknown
  for (const url of urls) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 15000)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: ctrl.signal,
      })
      clearTimeout(timer)
      if (res.status === 429) throw new RpcError('The public network server is busy. Wait a few seconds and try again.')
      if (!res.ok) throw new RpcError(`Network server error (${res.status}).`)
      const json = await res.json()
      if (json.error) throw new RpcError(json.error.data || json.error.message || 'Network query failed')
      return json.result
    } catch (e) {
      last = e
    }
  }
  if (last instanceof RpcError) throw last
  throw new RpcError('Could not reach the network. Check your connection and try again.')
}

export function hexToUtf8(hex: string): string {
  if (!hex) return ''
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex
  if (!/^[0-9a-fA-F]*$/.test(clean) || clean.length % 2) return ''
  const bytes = new Uint8Array(clean.match(/../g)!.map((h) => parseInt(h, 16)))
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { return '' }
}

export const nimRpc = {
  async tx(net: Network, hash: string): Promise<NimTx | null> {
    if (store.demo()) return demoLedger.get(hash)
    try {
      const r = await post(NIM_RPC[net], 'getTransactionByHash', [hash])
      return (r?.data ?? null) as NimTx | null
    } catch (e) {
      // Unknown / not yet mined transactions come back as an error from the RPC.
      if (e instanceof RpcError && /not found|unknown|no transaction/i.test(e.message)) return null
      throw e
    }
  },
  async txsByAddress(net: Network, address: string, max = 200): Promise<NimTx[]> {
    if (store.demo()) return demoLedger.byAddress(address)
    const r = await post(NIM_RPC[net], 'getTransactionsByAddress', [address, max, null])
    return (r?.data ?? []) as NimTx[]
  },
}

export interface PolyTransfer { hash: string; from: string; to: string; amount: bigint; blockNumber: number; timestamp: number; success: boolean }

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
export const USDT_POLYGON = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'

export const polygonRpc = {
  /** Returns the USDT transfers inside a Polygon transaction, or null if it isn't mined yet. */
  async usdtTransfers(hash: string): Promise<PolyTransfer[] | null> {
    if (store.demo()) {
      const t = demoLedger.getPoly(hash)
      return t ? [t] : null
    }
    const receipt = await post(POLYGON_RPC, 'eth_getTransactionReceipt', [hash])
    if (!receipt) return null
    const block = await post(POLYGON_RPC, 'eth_getBlockByNumber', [receipt.blockNumber, false])
    const timestamp = Number(BigInt(block?.timestamp ?? '0x0')) * 1000
    const success = receipt.status === '0x1'
    return (receipt.logs as any[])
      .filter((l) => l.address.toLowerCase() === USDT_POLYGON.toLowerCase() && l.topics[0] === TRANSFER_TOPIC)
      .map((l) => ({
        hash,
        from: '0x' + l.topics[1].slice(26),
        to: '0x' + l.topics[2].slice(26),
        amount: BigInt(l.data),
        blockNumber: Number(BigInt(receipt.blockNumber)),
        timestamp,
        success,
      }))
  },
}

export function explorerTx(chain: 'nim' | 'pol', hash: string, net: Network = 'mainnet'): string {
  if (chain === 'pol') return `https://polygonscan.com/tx/${hash}`
  return net === 'testnet' ? `https://test.nimiq.watch/#${hash}` : `https://nimiq.watch/#${hash}`
}
