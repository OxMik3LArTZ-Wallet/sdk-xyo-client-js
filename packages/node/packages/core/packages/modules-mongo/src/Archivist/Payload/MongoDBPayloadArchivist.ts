import { assertEx } from '@xylabs/assert'
import { XyoBoundWitness } from '@xyo-network/boundwitness-model'
import { EmptyObject } from '@xyo-network/core'
import { AbstractModuleConfig, AbstractModuleConfigSchema, ModuleParams } from '@xyo-network/module'
import { AbstractPayloadArchivist, XyoPayloadFilterPredicate, XyoPayloadWithMeta } from '@xyo-network/node-core-model'
import { BaseMongoSdk } from '@xyo-network/sdk-xyo-mongo-js'
import { Filter, SortDirection } from 'mongodb'

import { COLLECTIONS } from '../../collections'
import { DefaultLimit, DefaultOrder } from '../../defaults'
import { getBaseMongoSdk, removeId } from '../../Mongo'

export interface MongoDBPayloadArchivistParams<TConfig extends AbstractModuleConfig = AbstractModuleConfig, T extends EmptyObject = EmptyObject>
  extends ModuleParams<TConfig> {
  sdk: BaseMongoSdk<XyoPayloadWithMeta<T>>
}

export class MongoDBPayloadArchivist extends AbstractPayloadArchivist<XyoPayloadWithMeta> {
  static override configSchema = AbstractModuleConfigSchema

  protected readonly sdk: BaseMongoSdk<XyoPayloadWithMeta>

  constructor(params: MongoDBPayloadArchivistParams) {
    super(params)
    this.sdk = params?.sdk || getBaseMongoSdk<XyoPayloadWithMeta>(COLLECTIONS.Payloads)
  }

  static override async create(params?: Partial<MongoDBPayloadArchivistParams>): Promise<MongoDBPayloadArchivist> {
    return (await super.create(params)) as MongoDBPayloadArchivist
  }

  async find(predicate: XyoPayloadFilterPredicate<XyoPayloadWithMeta>): Promise<XyoPayloadWithMeta[]> {
    const { _archive, archives, hash, limit, order, schema, schemas, timestamp, ...props } = predicate
    const parsedLimit = limit || DefaultLimit
    const parsedOrder = order || DefaultOrder
    const filter: Filter<XyoPayloadWithMeta<EmptyObject>> = { ...props }
    const sort: { [key: string]: SortDirection } = { _timestamp: parsedOrder === 'asc' ? 1 : -1 }
    if (timestamp) {
      const parsedTimestamp = timestamp ? timestamp : parsedOrder === 'desc' ? Date.now() : 0
      filter._timestamp = parsedOrder === 'desc' ? { $lt: parsedTimestamp } : { $gt: parsedTimestamp }
    }
    if (_archive) filter._archive = _archive
    if (archives?.length) filter._archive = { $in: archives }
    if (hash) filter._hash = hash
    if (schema) filter.schema = schema
    if (schemas?.length) filter.schema = { $in: schemas }
    return (await (await this.sdk.find(filter)).sort(sort).limit(parsedLimit).maxTimeMS(2000).toArray()).map(removeId)
  }

  async get(hashes: string[]): Promise<XyoPayloadWithMeta[]> {
    // NOTE: This assumes at most 1 of each hash is stored which is currently not the case
    const limit = hashes.length
    assertEx(limit > 0, 'MongoDBPayloadArchivist.get: No hashes supplied')
    assertEx(limit < 10, 'MongoDBPayloadArchivist.get: Retrieval of > 100 hashes at a time not supported')
    return (await (await this.sdk.find({ _hash: { $in: hashes } })).sort({ _timestamp: -1 }).limit(limit).toArray()).map(removeId)
  }

  async insert(items: XyoPayloadWithMeta[]): Promise<XyoBoundWitness[]> {
    const result = await this.sdk.insertMany(items.map(removeId) as XyoPayloadWithMeta[])
    if (result.insertedCount != items.length) {
      throw new Error('MongoDBPayloadArchivist.insert: Error inserting Payloads')
    }
    const [bw] = await this.bindResult(items)
    return [bw]
  }
}