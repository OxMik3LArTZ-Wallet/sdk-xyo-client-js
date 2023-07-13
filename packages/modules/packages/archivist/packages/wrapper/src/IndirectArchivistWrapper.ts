import {
  ArchivistAllQuery,
  ArchivistAllQuerySchema,
  ArchivistClearQuery,
  ArchivistClearQuerySchema,
  ArchivistCommitQuery,
  ArchivistCommitQuerySchema,
  ArchivistDeleteQuery,
  ArchivistDeleteQuerySchema,
  ArchivistGetQuery,
  ArchivistGetQuerySchema,
  ArchivistInsertQuery,
  ArchivistInsertQuerySchema,
  ArchivistInstance,
  ArchivistModule,
  IndirectArchivistModule,
} from '@xyo-network/archivist-model'
import { BoundWitness, BoundWitnessSchema, isBoundWitnessPayload } from '@xyo-network/boundwitness-model'
import { PayloadHasher } from '@xyo-network/core'
import { constructableModuleWrapper, ModuleWrapper } from '@xyo-network/module-wrapper'
import { Payload } from '@xyo-network/payload-model'
import { PayloadWrapper } from '@xyo-network/payload-wrapper'
import compact from 'lodash/compact'

constructableModuleWrapper()
export class IndirectArchivistWrapper<TWrappedModule extends ArchivistModule = ArchivistModule>
  extends ModuleWrapper<TWrappedModule>
  implements IndirectArchivistModule<TWrappedModule['params']>, ArchivistInstance
{
  static override requiredQueries = [ArchivistGetQuerySchema, ...super.requiredQueries]

  async all(): Promise<Payload[]> {
    const queryPayload = PayloadWrapper.wrap<ArchivistAllQuery>({ schema: ArchivistAllQuerySchema })
    const result = await this.sendQuery(queryPayload)
    return compact(result)
  }

  async clear(): Promise<void> {
    const queryPayload = PayloadWrapper.wrap<ArchivistClearQuery>({ schema: ArchivistClearQuerySchema })
    await this.sendQuery(queryPayload)
  }

  async commit(): Promise<BoundWitness[]> {
    const queryPayload = PayloadWrapper.wrap<ArchivistCommitQuery>({ schema: ArchivistCommitQuerySchema })
    const result = await this.sendQuery(queryPayload)
    return result.filter(isBoundWitnessPayload)
  }

  async delete(hashes: string[]) {
    const queryPayload = PayloadWrapper.wrap<ArchivistDeleteQuery>({ hashes, schema: ArchivistDeleteQuerySchema })
    const query = await this.bindQuery(queryPayload)
    const result = await this.module.query(query[0], query[1])
    await this.throwErrors(query, result)
    return result[0].payload_hashes.map(() => true)
  }

  async get(hashes: string[]): Promise<Payload[]> {
    const queryPayload = PayloadWrapper.wrap<ArchivistGetQuery>({ hashes, schema: ArchivistGetQuerySchema })
    const result = await this.sendQuery(queryPayload)
    return result
  }

  async insert(payloads: Payload[]): Promise<BoundWitness[]> {
    const queryPayload = PayloadWrapper.wrap<ArchivistInsertQuery>({
      payloads: await PayloadHasher.hashes(payloads),
      schema: ArchivistInsertQuerySchema,
    })
    const query = await this.bindQuery(queryPayload, payloads)
    const result = await this.module.query(query[0], [queryPayload.payload(), ...payloads])
    const innerBoundWitnesses = result[1]?.filter<BoundWitness>((payload): payload is BoundWitness => payload?.schema === BoundWitnessSchema) ?? []
    await this.throwErrors(query, result)
    return [result[0], ...innerBoundWitnesses]
  }
}