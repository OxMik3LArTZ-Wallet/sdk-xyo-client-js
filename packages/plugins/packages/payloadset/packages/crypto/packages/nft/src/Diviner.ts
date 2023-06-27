import { AbstractDiviner } from '@xyo-network/abstract-diviner'
import {
  isNftInfoPayload,
  NftScoreDivinerConfig,
  NftScoreDivinerConfigSchema,
  NftScorePayload,
  NftScoreSchema,
} from '@xyo-network/crypto-wallet-nft-payload-plugin'
import { DivinerParams } from '@xyo-network/diviner-model'
import { AnyConfigSchema } from '@xyo-network/module'
import { Payload } from '@xyo-network/payload-model'

import { analyzeNft, NftAnalysis } from './lib'

export type NftScoreDivinerParams = DivinerParams<AnyConfigSchema<NftScoreDivinerConfig>>

const toNftScorePayload = (rating: NftAnalysis): NftScorePayload => {
  return { ...rating, schema: NftScoreSchema } as NftScorePayload
}

export const isNftScorePayload = (payload: Payload): payload is NftScorePayload => payload.schema === NftScoreSchema

export class NftScoreDiviner<TParams extends NftScoreDivinerParams = NftScoreDivinerParams> extends AbstractDiviner<TParams> {
  static override configSchema = NftScoreDivinerConfigSchema

  override divine = async (payloads?: Payload[]): Promise<Payload[]> =>
    (await Promise.all(payloads?.filter(isNftInfoPayload).map(analyzeNft) ?? [])).map(toNftScorePayload)
}