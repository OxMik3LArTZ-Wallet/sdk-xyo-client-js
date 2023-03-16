import { AddressSchema } from '@xyo-network/address-payload-plugin'
import { AbstractDiviner, AddressSpaceDiviner, DivinerConfig, DivinerParams, XyoArchivistPayloadDivinerConfigSchema } from '@xyo-network/diviner'
import { AnyConfigSchema } from '@xyo-network/module-model'
import { XyoBoundWitnessWithMeta } from '@xyo-network/node-core-model'
import { XyoPayloadBuilder } from '@xyo-network/payload-builder'
import { XyoPayloads } from '@xyo-network/payload-model'
import { BaseMongoSdk } from '@xyo-network/sdk-xyo-mongo-js'

import { COLLECTIONS } from '../../collections'
import { DATABASES } from '../../databases'
import { DefaultMaxTimeMS } from '../../defaults'

export type MongoDBAddressSpaceDivinerParams<TConfig extends DivinerConfig = DivinerConfig> = DivinerParams<
  AnyConfigSchema<TConfig>,
  {
    boundWitnessSdk: BaseMongoSdk<XyoBoundWitnessWithMeta>
  }
>

export class MongoDBAddressSpaceDiviner<TParams extends MongoDBAddressSpaceDivinerParams = MongoDBAddressSpaceDivinerParams>
  extends AbstractDiviner<TParams>
  implements AddressSpaceDiviner
{
  static override configSchema = XyoArchivistPayloadDivinerConfigSchema

  override async divine(_payloads?: XyoPayloads): Promise<XyoPayloads> {
    //const query = payloads?.find<AddressSpaceQueryPayload>(isAddressSpaceQueryPayload)
    //if (!query) return []
    // Issue a distinct query against the BoundWitnesses collection
    // on the address field
    const result = await this.params.boundWitnessSdk.useMongo((db) => {
      return db.db(DATABASES.Archivist).command(
        {
          distinct: COLLECTIONS.BoundWitnesses,
          key: 'addresses',
        },
        { maxTimeMS: DefaultMaxTimeMS },
      )
    })
    // Ensure uniqueness on case
    const addresses = new Set<string>(result?.values?.map((address: string) => address?.toLowerCase()))
    return [...addresses].map((address) => new XyoPayloadBuilder({ schema: AddressSchema }).fields({ address }).build())
  }
}