import type { ExternalProvider, JsonRpcFetchFunc } from '@ethersproject/providers'
import { assertEx } from '@xylabs/assert'
import { CryptoWalletNftWitnessConfig, NftInfoPayload, NftSchema, NftWitnessConfigSchema } from '@xyo-network/crypto-wallet-nft-payload-plugin'
import { AnyConfigSchema } from '@xyo-network/module'
import { Payload } from '@xyo-network/payload-model'
import { AbstractWitness, WitnessParams } from '@xyo-network/witness'

import { getNftsOwnedByAddress } from './lib'

export type CryptoWalletNftWitnessParams = WitnessParams<
  AnyConfigSchema<CryptoWalletNftWitnessConfig>,
  {
    provider?: ExternalProvider | JsonRpcFetchFunc
  }
>

const schema = NftSchema

export class CryptoWalletNftWitness<TParams extends CryptoWalletNftWitnessParams = CryptoWalletNftWitnessParams> extends AbstractWitness<TParams> {
  static override configSchemas = [NftWitnessConfigSchema]

  protected get provider() {
    return assertEx(this.params.provider, 'Provider Required')
  }

  protected override async observeHandler(_payloads?: Payload[]): Promise<Payload[]> {
    await this.started('throw')
    const address = assertEx(this.config.address, 'params.address is required')
    const chainId = assertEx(this.config.chainId, 'params.chainId is required')
    const nfts = await getNftsOwnedByAddress(address, chainId, this.provider)
    const observations = nfts.map<NftInfoPayload>((nft) => {
      return { ...nft, schema }
    })
    return observations
  }
}
