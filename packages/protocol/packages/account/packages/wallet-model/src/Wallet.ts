export interface Mnemonic {
  readonly locale: string
  readonly path: string
  readonly phrase: string
}

export interface WalletInstance {
  readonly address: string
  readonly chainCode: string
  readonly depth: number
  readonly derivePath: (path: string) => WalletInstance
  readonly extendedKey: string
  readonly fingerprint: string
  readonly index: number
  readonly mnemonic?: Mnemonic | undefined
  readonly neuter: () => WalletInstance
  readonly parentFingerprint: string
  readonly path: string
  readonly privateKey: string
  readonly publicKey: string
}

export interface WalletStatic {
  fromExtendedKey(key: string): WalletInstance
  fromMnemonic(mnemonic: string): WalletInstance
  fromSeed(seed: string | Uint8Array): WalletInstance
}