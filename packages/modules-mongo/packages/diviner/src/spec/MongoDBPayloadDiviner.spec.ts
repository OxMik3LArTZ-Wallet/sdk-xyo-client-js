import { describeIf } from '@xylabs/jest-helpers'
import { HDWallet } from '@xyo-network/account'
import { PayloadDivinerConfigSchema, PayloadDivinerQueryPayload, PayloadDivinerQuerySchema } from '@xyo-network/diviner-payload-model'
import { COLLECTIONS, hasMongoDBConfig } from '@xyo-network/module-abstract-mongodb'
import { BoundWitnessWithPartialMeta, PayloadWithMeta } from '@xyo-network/node-core-model'
import { PayloadBuilder } from '@xyo-network/payload-builder'
import { BaseMongoSdk } from '@xyo-network/sdk-xyo-mongo-js'
import { mock } from 'jest-mock-extended'

import { MongoDBPayloadDiviner } from '../MongoDBPayloadDiviner'

describeIf(hasMongoDBConfig())('MongoDBPayloadDiviner', () => {
  const testSchema = 'network.xyo.test'
  const logger = mock<Console>()
  const payloadSdk: BaseMongoSdk<PayloadWithMeta> = new BaseMongoSdk<PayloadWithMeta>({
    collection: COLLECTIONS.Payloads,
    dbConnectionString: process.env.MONGO_CONNECTION_STRING,
  })
  let sut: MongoDBPayloadDiviner
  beforeAll(async () => {
    sut = await MongoDBPayloadDiviner.create({
      account: await HDWallet.random(),
      config: { schema: PayloadDivinerConfigSchema },
      logger,
    })
    // TODO: Insert via archivist
    const payload = new PayloadBuilder({ schema: testSchema }).build()
    await payloadSdk.insertOne(payload as unknown as PayloadWithMeta)
  })
  describe('divine', () => {
    describe('with valid query', () => {
      it('divines', async () => {
        const query: PayloadDivinerQueryPayload = { limit: 1, schema: PayloadDivinerQuerySchema, schemas: [testSchema] }
        const result = await sut.divine([query])
        expect(result).toBeArrayOfSize(1)
        const actual = result[0] as BoundWitnessWithPartialMeta
        expect(actual).toBeObject()
        expect(actual.schema).toBeDefined()
        expect(actual.schema).toBeString()
      })
    })
  })
})