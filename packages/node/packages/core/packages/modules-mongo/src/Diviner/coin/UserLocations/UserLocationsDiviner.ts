import 'reflect-metadata'

import { assertEx } from '@xylabs/assert'
import { AbstractDiviner, DivinerParams, XyoArchivistPayloadDivinerConfig, XyoArchivistPayloadDivinerConfigSchema } from '@xyo-network/diviner'
import { LocationPayload, LocationSchema } from '@xyo-network/location-payload-plugin'
import { AnyConfigSchema } from '@xyo-network/module-model'
import { BoundWitnessesArchivist, CoinUserLocationsDiviner, PayloadArchivist } from '@xyo-network/node-core-model'
import { XyoPayload, XyoPayloads } from '@xyo-network/payload-model'
import { PayloadWrapper } from '@xyo-network/payload-wrapper'
import compact from 'lodash/compact'

export type CoinCurrentUserWitnessSchema = 'co.coinapp.current.user.witness'
export const CoinCurrentUserWitnessSchema: CoinCurrentUserWitnessSchema = 'co.coinapp.current.user.witness'

export type CoinCurrentUserWitnessPayload = XyoPayload<{
  balance?: number
  daysOld?: number
  deviceId?: string
  geomines?: number
  planType?: string
  schema: CoinCurrentUserWitnessSchema
  uid: string
}>

export type CoinCurrentLocationWitnessSchema = 'co.coinapp.current.location.witness'
export const CoinCurrentLocationWitnessSchema: CoinCurrentLocationWitnessSchema = 'co.coinapp.current.location.witness'

export type CoinCurrentLocationWitnessPayload = XyoPayload<{
  altitudeMeters: number
  directionDegrees: number
  latitude: number
  quadkey: string
  schema: CoinCurrentLocationWitnessSchema
  speedKph: number
}>

export const isLocationPayload = (x?: XyoPayload | null): x is LocationPayload => x?.schema === LocationSchema

export type CoinUserLocationsDivinerParams<T extends XyoPayload = XyoPayload> = DivinerParams<
  AnyConfigSchema<XyoArchivistPayloadDivinerConfig<T>>,
  {
    bws: BoundWitnessesArchivist
    payloads: PayloadArchivist
  }
>

export class MemoryCoinUserLocationsDiviner<TParams extends CoinUserLocationsDivinerParams = CoinUserLocationsDivinerParams>
  extends AbstractDiviner<TParams>
  implements CoinUserLocationsDiviner
{
  static override configSchema = XyoArchivistPayloadDivinerConfigSchema

  async divine(payloads?: XyoPayloads): Promise<XyoPayloads<LocationPayload>> {
    const user = payloads?.find<CoinCurrentUserWitnessPayload>(
      (payload): payload is CoinCurrentUserWitnessPayload => payload?.schema === CoinCurrentUserWitnessSchema,
    )
    // If this is a query we support
    if (user) {
      const wrapper = new PayloadWrapper(user)
      // TODO: Extract relevant query values here
      this.logger?.log('CoinUserLocationsDiviner.Divine: Processing query')
      // Simulating work
      const bwList = (await this.params.bws.find({ payload_hashes: [wrapper.hash] })) ?? []
      const locationHashes = bwList
        .map((bw) => {
          const locations: string[] = []
          for (let i = 0; i < bwList.length; i++) {
            if (bw?.payload_schemas[i] === CoinCurrentLocationWitnessSchema) {
              locations.push(assertEx(bw?.payload_hashes[i], 'Missing hash'))
            }
          }
          return locations
        })
        .flat()
      const locations = compact(await this.params.payloads.get(locationHashes)) as unknown as LocationPayload[]
      this.logger?.log('CoinUserLocationsDiviner.Divine: Processed query')
      return locations
    }
    // else return empty response
    return []
  }
}
