import { HDNode } from '@ethersproject/hdnode'
import { staticImplements } from '@xylabs/static-implements'
import { AccountInstance } from '@xyo-network/account-model'
import { Mnemonic, WalletStatic } from '@xyo-network/wallet-model'

import { HDAccount } from './HDAccount'

@staticImplements<WalletStatic<HDWallet>>()
export class HDWallet extends HDAccount implements AccountInstance {
  get address(): string {
    return this.node.address
  }

  get chainCode(): string {
    return this.node.chainCode
  }

  get depth(): number {
    return this.node.depth
  }

  get extendedKey(): string {
    return this.node.extendedKey
  }

  get fingerprint(): string {
    return this.node.fingerprint
  }

  get index(): number {
    return this.node.index
  }

  get mnemonic(): Mnemonic | undefined {
    return this.node.mnemonic
  }

  get parentFingerprint(): string {
    return this.node.parentFingerprint
  }

  get path(): string {
    return this.node.path
  }

  get privateKey(): string {
    return this.node.privateKey
  }

  get publicKey(): string {
    return this.node.publicKey
  }

  static fromExtendedKey(key: string) {
    const node = HDNode.fromExtendedKey(key)
    return new HDWallet(node)
  }

  static override fromMnemonic(mnemonic: string) {
    const node = HDNode.fromMnemonic(mnemonic)
    return new HDWallet(node)
  }

  static fromSeed(seed: string | Uint8Array) {
    const node = HDNode.fromSeed(seed)
    return new HDWallet(node)
  }

  /**
   * @deprecated Use derivePath instead as HDWallet now implements AccountInstance
   */
  deriveAccount: (path: string) => AccountInstance = (path: string) => {
    return this.derivePath(path)
  }

  derivePath: (path: string) => HDWallet = (path: string) => {
    return new HDWallet(this.node.derivePath(path))
  }

  neuter: () => HDWallet = () => {
    this.node.neuter()
    return this
  }
}
