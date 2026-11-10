// Wallet layer: the only place that talks to Nimiq Pay's injected providers.
// Nimiq provider via @nimiq/mini-app-sdk init(); EVM provider via window.ethereum (USDT on Polygon).
import { init, getHostNetwork, NimiqProviderError, type NimiqProvider } from '@nimiq/mini-app-sdk'
import { encodeFunctionData } from 'viem'
import { reactive } from 'vue'
import { store } from './store'
import { demoLedger, DEMO_EVM_ADDRESS, DEMO_NIM_ADDRESS } from './demo'
import { USDT_POLYGON } from './rpc'
import type { Network } from './event'

export const wallet = reactive({
  status: 'connecting' as 'connecting' | 'ready' | 'unavailable',
  demo: store.demo(),
  network: (getHostNetwork() ?? 'mainnet') as Network,
  nimAccounts: [] as string[],
  evmAccount: '' as string,
  error: '' as string,
})

let provider: NimiqProvider | null = null

export async function connectProvider() {
  if (wallet.demo) { wallet.status = 'ready'; return }
  try {
    provider = await init({ timeout: 6000 })
    wallet.status = 'ready'
  } catch {
    wallet.status = 'unavailable'
  }
}

export function setDemo(on: boolean) {
  store.setDemo(on)
  wallet.demo = on
  wallet.nimAccounts = []
  wallet.evmAccount = ''
  if (on) wallet.status = 'ready'
  else connectProvider()
}

/** Turn any wallet failure into a short, human sentence. Cancelling is not an error. */
export function explainWalletError(e: unknown): { cancelled: boolean; message: string } {
  const anyE = e as any
  if (NimiqProviderError.is(e)) {
    if (e.type === 'PERMISSION_DENIED') return { cancelled: true, message: 'You cancelled in Nimiq Pay. Nothing was sent.' }
    if (e.type === 'UNKNOWN_REQUEST') return { cancelled: false, message: 'Your Nimiq Pay version does not support this yet. Please update the app.' }
    if (e.type === 'INVALID_TRANSACTION') return { cancelled: false, message: `Nimiq Pay rejected the payment details: ${e.message}` }
    if (e.type === 'NETWORK_ERROR') return { cancelled: false, message: 'Network problem while sending. Check "My tickets" before paying again — it may have gone through.' }
    return { cancelled: false, message: e.message || 'Nimiq Pay could not complete the request.' }
  }
  if (anyE?.code === 4001) return { cancelled: true, message: 'You cancelled in Nimiq Pay. Nothing was sent.' }
  if (anyE?.code === 4902) return { cancelled: false, message: 'Polygon is not set up in your wallet.' }
  if (/insufficient funds|gas/i.test(anyE?.message || '')) return { cancelled: false, message: 'Not enough POL for the Polygon network fee. Add a little POL and try again.' }
  return { cancelled: false, message: anyE?.message || String(e) }
}

function requireProvider(): NimiqProvider {
  if (!provider) throw new Error('Open Stub inside Nimiq Pay to use your wallet, or switch on Demo mode.')
  return provider
}

export async function getNimAccounts(): Promise<string[]> {
  if (wallet.demo) { wallet.nimAccounts = [DEMO_NIM_ADDRESS]; return wallet.nimAccounts }
  const accounts = await requireProvider().listAccounts()
  wallet.nimAccounts = accounts
  return accounts
}

/** One approval dialog only: Nimiq Pay picks the signing account; we read the sender from the chain afterwards. */
export async function payNim(recipient: string, luna: bigint, memo: string): Promise<{ hash: string; from: string }> {
  const from = wallet.nimAccounts[0] ?? ''
  if (wallet.demo) return { hash: demoLedger.sendNim(from || DEMO_NIM_ADDRESS, recipient, Number(luna), memo), from: from || DEMO_NIM_ADDRESS }
  if (luna > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Amount too large')
  const hash = await requireProvider().sendBasicTransactionWithData({ recipient, value: Number(luna), data: memo })
  return { hash, from }
}

export async function nimBalance(address: string): Promise<number | null> {
  if (wallet.demo) return 1_000_000_00000
  const p = provider
  if (!p || typeof p.getBalance !== 'function') return null
  try { return await p.getBalance(address) } catch { return null }
}

// ---------- USDT on Polygon via the EVM provider ----------
const ERC20_TRANSFER = [{
  name: 'transfer', type: 'function', stateMutability: 'nonpayable',
  inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
  outputs: [{ name: '', type: 'bool' }],
}] as const

function eth(): any {
  const e = (window as any).ethereum
  if (!e) throw new Error('Open Stub inside Nimiq Pay to pay with USDT, or switch on Demo mode.')
  return e
}

export async function getEvmAccount(): Promise<string> {
  if (wallet.demo) { wallet.evmAccount = DEMO_EVM_ADDRESS; return DEMO_EVM_ADDRESS }
  const accounts: string[] = await eth().request({ method: 'eth_requestAccounts' })
  wallet.evmAccount = accounts[0]
  return accounts[0]
}

export async function payUsdt(recipient: string, amount: bigint): Promise<{ hash: string; from: string }> {
  const from = wallet.evmAccount || (await getEvmAccount())
  if (wallet.demo) return { hash: demoLedger.sendUsdt(from, recipient, amount), from }
  const e = eth()
  const chainId: string = await e.request({ method: 'eth_chainId' })
  if (chainId?.toLowerCase() !== '0x89') {
    await e.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] })
  }
  const data = encodeFunctionData({ abi: ERC20_TRANSFER, functionName: 'transfer', args: [recipient as `0x${string}`, amount] })
  const hash: string = await e.request({ method: 'eth_sendTransaction', params: [{ from, to: USDT_POLYGON, data, value: '0x0' }] })
  return { hash, from }
}

// ---------- Host niceties ----------
export async function goFullscreen(on: boolean) {
  const host = window.nimiqPay
  if (!host) return
  try { on ? await host.requestFullscreen() : await host.exitFullscreen() } catch { /* host refused */ }
}
export const hasFullscreen = () => !!window.nimiqPay?.requestFullscreen
