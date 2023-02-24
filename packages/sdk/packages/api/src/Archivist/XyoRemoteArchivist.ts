import { AbstractArchivist, ArchivistFindQuerySchema, ArchivistInsertQuerySchema } from '@xyo-network/archivist'
import { isXyoBoundWitnessPayload, XyoBoundWitness } from '@xyo-network/boundwitness-model'
import { ModuleParams } from '@xyo-network/module'
import { PayloadFindFilter, XyoPayload } from '@xyo-network/payload-model'
import { PayloadWrapper } from '@xyo-network/payload-wrapper'
import compact from 'lodash/compact'

import { XyoArchivistApi } from '../Api'
import { RemoteArchivistError } from './RemoteArchivistError'
import { XyoRemoteArchivistConfig, XyoRemoteArchivistConfigSchema } from './XyoRemoteArchivistConfig'

export type XyoRemoteArchivistParams = ModuleParams<XyoRemoteArchivistConfig> & { api?: XyoArchivistApi }

/** @description Archivist Context that connects to a remote archivist using the API */
export class XyoRemoteArchivist extends AbstractArchivist<XyoRemoteArchivistConfig> {
  static override configSchema = XyoRemoteArchivistConfigSchema
  protected _api?: XyoArchivistApi

  constructor(params: XyoRemoteArchivistParams) {
    super(params)
    this._api = params?.api
  }

  get api() {
    if (this._api) {
      return this._api
    }
    // eslint-disable-next-line deprecation/deprecation
    if (this.config?.api) {
      this.logger?.warn('api specified in config but should be specified in params')
      // eslint-disable-next-line deprecation/deprecation
      return this.config?.api
    }
    throw Error('No api specified')
  }

  get archive() {
    return this.config?.archive
  }

  override get queries(): string[] {
    return [ArchivistFindQuerySchema, ArchivistInsertQuerySchema, ...super.queries]
  }

  static override async create(params?: XyoRemoteArchivistParams): Promise<XyoRemoteArchivist> {
    return (await super.create(params)) as XyoRemoteArchivist
  }

  override async find<R extends XyoPayload = XyoPayload>(filter: PayloadFindFilter): Promise<R[]> {
    try {
      const [payloads = [], payloadEnvelope, payloadResponse] = await this.api.archive(this.archive).payload.find(filter, 'tuple')
      if (payloadEnvelope?.errors?.length) {
        throw new RemoteArchivistError('find', payloadEnvelope.errors.shift(), 'payloads')
      }
      if (payloadResponse?.status >= 300) {
        throw new RemoteArchivistError('find', `Invalid payload status [${payloadResponse.status}]`, 'payloads')
      }
      const [blocks = [], blockEnvelope, blockResponse] = await this.api.archive(this.archive).block.find(filter, 'tuple')
      if (blockEnvelope?.errors?.length) {
        throw new RemoteArchivistError('find', blockEnvelope.errors.shift(), 'payloads')
      }
      if (blockResponse?.status >= 300) {
        throw new RemoteArchivistError('find', `Invalid block status [${blockResponse.status}]`, 'payloads')
      }
      return payloads.concat(blocks) as R[]
    } catch (ex) {
      console.error(ex)
      throw ex
    }
  }

  override async get(hashes: string[]): Promise<XyoPayload[]> {
    return compact(
      await Promise.all(
        hashes.map(async (hash) => {
          try {
            const [payloads = [], payloadEnvelope, payloadResponse] = await this.api.archive(this.archive).payload.hash(hash).get('tuple')
            if (payloadResponse?.status >= 400) {
              throw new RemoteArchivistError('get', `Invalid payload status [${payloadResponse.status}]`, 'payloads')
            }
            if (payloadEnvelope?.errors?.length) {
              throw new RemoteArchivistError('get', payloadEnvelope.errors.shift(), 'payloads')
            }
            const [blocks = [], blockEnvelope, blockResponse] = await this.api.archive(this.archive).block.hash(hash).get('tuple')
            if (blockResponse?.status >= 400) {
              throw new RemoteArchivistError('get', `Invalid block status [${blockResponse.status}]`, 'payloads')
            }
            if (blockEnvelope?.errors?.length) {
              throw new RemoteArchivistError('get', blockEnvelope.errors.shift(), 'blocks')
            }
            return payloads?.[0] ?? blocks?.[0]
          } catch (ex) {
            console.error(ex)
            throw ex
          }
        }),
      ),
    )
  }

  async insert(payloads: XyoPayload[]): Promise<XyoBoundWitness[]> {
    try {
      const boundWitnesses: XyoBoundWitness[] = payloads.filter(isXyoBoundWitnessPayload)
      boundWitnesses.forEach((boundwitness) => {
        // doing this here to prevent breaking code (for now)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyBoundwitness: any = boundwitness
        anyBoundwitness._payloads ===
          payloads.filter((payload) => {
            const hash = new PayloadWrapper(payload).hash
            return boundwitness.payload_hashes.includes(hash)
          })
      })
      const [boundwitness] = await this.bindResult(payloads)
      const bwWithMeta: XyoBoundWitness & { _payloads: XyoPayload[] } = { ...boundwitness, _payloads: payloads }
      const bwResult = await this.api.archive(this.archive).block.post([bwWithMeta], 'tuple')
      const [, response, error] = bwResult
      if (error?.status >= 400) {
        throw new RemoteArchivistError('insert', `${error.statusText} [${error.status}]`)
      }
      if (response?.errors?.length) {
        throw new RemoteArchivistError('insert', response?.errors)
      }
      return [boundwitness]
    } catch (ex) {
      console.error(ex)
      throw ex
    }
  }
}
