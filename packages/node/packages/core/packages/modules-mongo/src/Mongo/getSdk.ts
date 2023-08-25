import { BoundWitnessWithMeta, PayloadWithMeta } from '@xyo-network/node-core-model'
import { BaseMongoSdk } from '@xyo-network/sdk-xyo-mongo-js'

import { COLLECTIONS } from '../collections'
import { AddressInfo } from './AddressInfo'
import { getBaseMongoSdk } from './getBaseMongoSdk'

export const getBoundWitnessSdk = (): BaseMongoSdk<BoundWitnessWithMeta> => getBaseMongoSdk<BoundWitnessWithMeta>(COLLECTIONS.BoundWitnesses)

export const getPayloadSdk = (): BaseMongoSdk<PayloadWithMeta> => getBaseMongoSdk<PayloadWithMeta>(COLLECTIONS.Payloads)

export const getThumbnailsSdk = (): BaseMongoSdk<PayloadWithMeta> => getBaseMongoSdk<PayloadWithMeta>(COLLECTIONS.Thumbnails)

export const getAddressSdk = (): BaseMongoSdk<AddressInfo> => getBaseMongoSdk<AddressInfo>(COLLECTIONS.AddressInfo)
