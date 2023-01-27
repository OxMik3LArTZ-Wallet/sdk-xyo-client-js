import { assertEx } from '@xylabs/assert'
import { Account } from '@xyo-network/account'
import { ArchivistFindQuerySchema, ArchivistGetQuerySchema, ArchivistInsertQuerySchema, ArchivistQuery } from '@xyo-network/archivist'
import { XyoBoundWitness } from '@xyo-network/boundwitness-model'
import { AbstractModule, AbstractModuleConfig, ModuleQueryResult, QueryBoundWitnessWrapper, XyoQueryBoundWitness } from '@xyo-network/module'
import { XyoPayload } from '@xyo-network/payload-model'
import { PayloadWrapper } from '@xyo-network/payload-wrapper'

import { XyoBoundWitnessWithPartialMeta } from '../BoundWitness'
import { ArchiveModuleConfig } from './ArchiveModuleConfig'
import { BoundWitnessArchivist } from './BoundWitnessArchivist'
import { XyoBoundWitnessFilterPredicate } from './XyoBoundWitnessFilterPredicate'

export abstract class AbstractBoundWitnessArchivist extends AbstractModule<ArchiveModuleConfig> implements BoundWitnessArchivist {
  public override queries() {
    return [ArchivistFindQuerySchema, ArchivistGetQuerySchema, ArchivistInsertQuerySchema, ...super.queries()]
  }

  override async query<T extends XyoQueryBoundWitness = XyoQueryBoundWitness, TConfig extends AbstractModuleConfig = AbstractModuleConfig>(
    query: T,
    payloads?: XyoPayload[],
    queryConfig?: TConfig,
  ): Promise<ModuleQueryResult> {
    const wrapper = QueryBoundWitnessWrapper.parseQuery<ArchivistQuery>(query, payloads)
    const typedQuery = wrapper.query.payload
    assertEx(this.queryable(query, payloads, queryConfig))
    const result: XyoPayload[] = []
    const queryAccount = new Account()
    switch (typedQuery.schema) {
      case ArchivistFindQuerySchema:
        if (typedQuery.filter) result.push(...(await this.find(typedQuery.filter as XyoBoundWitnessFilterPredicate)))
        break
      case ArchivistGetQuerySchema:
        result.push(...(await this.get(typedQuery.hashes)))
        break
      case ArchivistInsertQuerySchema: {
        const wrappers = payloads?.map((payload) => PayloadWrapper.parse(payload)) ?? []
        assertEx(typedQuery.payloads, `Missing payloads: ${JSON.stringify(typedQuery, null, 2)}`)
        const resolvedWrappers = wrappers.filter((wrapper) => typedQuery.payloads.includes(wrapper.hash))
        assertEx(resolvedWrappers.length === typedQuery.payloads.length, 'Could not find some passed hashes')
        result.push(...(await this.insert(resolvedWrappers.map((wrapper) => wrapper.payload) as XyoBoundWitnessWithPartialMeta[])))
        break
      }
      default:
        return super.query(query, payloads)
    }
    return this.bindResult(result, queryAccount)
  }
  abstract find(filter?: XyoBoundWitnessFilterPredicate | undefined): Promise<Array<XyoBoundWitnessWithPartialMeta>>
  abstract get(ids: string[]): Promise<Array<XyoBoundWitnessWithPartialMeta>>
  abstract insert(item: XyoBoundWitnessWithPartialMeta[]): Promise<XyoBoundWitness[]>
}