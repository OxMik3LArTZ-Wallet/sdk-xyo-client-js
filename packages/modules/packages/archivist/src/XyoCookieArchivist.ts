import { assertEx } from '@xylabs/sdk-js'
import { XyoBoundWitness } from '@xyo-network/boundwitness'
import { XyoPayload, XyoPayloadWrapper } from '@xyo-network/payload'
import { PromisableArray } from '@xyo-network/promise'
import Cookies from 'js-cookie'
import compact from 'lodash/compact'

import { XyoArchivistConfig } from './Config'
import { PartialArchivistConfig } from './PartialConfig'
import {
  XyoArchivistAllQuerySchema,
  XyoArchivistClearQuerySchema,
  XyoArchivistCommitQuerySchema,
  XyoArchivistDeleteQuerySchema,
  XyoArchivistFindQuerySchema,
  XyoArchivistInsertQuery,
  XyoArchivistInsertQuerySchema,
} from './Queries'
import { XyoArchivist } from './XyoArchivist'
import { XyoPayloadFindFilter } from './XyoPayloadFindFilter'

export type XyoCookieArchivistConfigSchema = 'network.xyo.module.config.archivist.cookie'
export const XyoCookieArchivistConfigSchema: XyoCookieArchivistConfigSchema = 'network.xyo.module.config.archivist.cookie'

export type XyoCookieArchivistConfig = XyoArchivistConfig<{
  schema: XyoCookieArchivistConfigSchema
  domain?: string
  maxEntries?: number
  maxEntrySize?: number
  namespace?: string
}>

class CookieArchivistError extends Error {
  constructor(action: string, error: Error['cause'], message?: string) {
    super(`Cookie Archivist [${action}] failed${message ? ` (${message})` : ''}`, { cause: error })
  }
}

export class XyoCookieArchivist extends XyoArchivist<XyoCookieArchivistConfig> {
  public get domain() {
    return this.config?.domain
  }

  public get namespace() {
    return this.config?.namespace ?? 'xyoarch'
  }

  public get maxEntries() {
    //all browsers support at least 60 cookies
    return this.config?.maxEntries ?? 60
  }

  public get maxEntrySize() {
    //all browsers support at least 4000 length per cookie
    return this.config?.maxEntrySize ?? 4000
  }

  public override queries() {
    return [
      XyoArchivistAllQuerySchema,
      XyoArchivistDeleteQuerySchema,
      XyoArchivistClearQuerySchema,
      XyoArchivistFindQuerySchema,
      XyoArchivistCommitQuerySchema,
      ...super.queries(),
    ]
  }

  constructor(config?: PartialArchivistConfig<XyoCookieArchivistConfig>) {
    super({ ...config, schema: XyoCookieArchivistConfigSchema })
  }

  private keyFromHash(hash: string) {
    return `${this.namespace}-${hash}`
  }

  public delete(hashes: string[]): PromisableArray<boolean> {
    try {
      return hashes.map((hash) => {
        Cookies.remove(this.keyFromHash(hash))
        return true
      })
    } catch (ex) {
      console.error(`Error: ${JSON.stringify(ex, null, 2)}`)
      throw new CookieArchivistError('delete', ex, 'unexpected')
    }
  }

  public override clear(): void | Promise<void> {
    try {
      Object.entries(Cookies.get()).map(([key]) => {
        if (key.startsWith(`${this.namespace}-`)) {
          Cookies.remove(key)
        }
      })
    } catch (ex) {
      console.error(`Error: ${JSON.stringify(ex, null, 2)}`)
      throw new CookieArchivistError('clear', ex, 'unexpected')
    }
  }

  public async get(hashes: string[]): Promise<(XyoPayload | null)[]> {
    try {
      return await Promise.all(
        hashes.map(async (hash) => {
          const cookieString = Cookies.get(this.keyFromHash(hash))
          return cookieString ? JSON.parse(cookieString) : (await this.getFromParents(hash)) ?? null
        }),
      )
    } catch (ex) {
      console.error(`Error: ${JSON.stringify(ex, null, 2)}`)
      throw new CookieArchivistError('get', ex, 'unexpected')
    }
  }

  public async insert(payloads: XyoPayload[]): Promise<XyoBoundWitness> {
    try {
      const storedPayloads: XyoPayload[] = payloads.map((payload) => {
        const wrapper = new XyoPayloadWrapper(payload)
        const key = this.keyFromHash(wrapper.hash)
        const value = JSON.stringify(wrapper.payload)
        assertEx(value.length < this.maxEntrySize, `Payload too large [${wrapper.hash}, ${value.length}]`)
        Cookies.set(key, JSON.stringify(wrapper.payload))
        return wrapper.payload
      })
      const [boundwitness] = await this.bindPayloads(storedPayloads)
      if (this.writeThrough) {
        await this.writeToParents([boundwitness, ...storedPayloads])
      }
      return boundwitness
    } catch (ex) {
      console.error(`Error: ${JSON.stringify(ex, null, 2)}`)
      throw new CookieArchivistError('insert', ex, 'unexpected')
    }
  }

  public async find(filter?: XyoPayloadFindFilter): Promise<XyoPayload[]> {
    try {
      const x = (await this.all()).filter((payload) => {
        if (filter?.schema && filter.schema !== payload.schema) {
          return false
        }
        return true
      })
      return x
    } catch (ex) {
      console.error(`Error: ${JSON.stringify(ex, null, 2)}`)
      throw new CookieArchivistError('find', ex, 'unexpected')
    }
  }

  public all(): PromisableArray<XyoPayload> {
    try {
      return Object.entries(Cookies.get())
        .filter(([key]) => key.startsWith(`${this.namespace}-`))
        .map(([, value]) => JSON.parse(value))
    } catch (ex) {
      console.error(`Error: ${JSON.stringify(ex, null, 2)}`)
      throw new CookieArchivistError('all', ex, 'unexpected')
    }
  }

  public async commit(): Promise<XyoBoundWitness> {
    try {
      const payloads = await this.all()
      assertEx(payloads.length > 0, 'Nothing to commit')
      const [block] = await this.bindPayloads(payloads)
      await Promise.allSettled(
        compact(
          Object.values(this.parents?.commit ?? [])?.map(async (parent) => {
            const query: XyoArchivistInsertQuery = { payloads: [block, ...payloads], schema: XyoArchivistInsertQuerySchema }
            return await parent?.query(query)
          }),
        ),
      )
      await this.clear()
      return block
    } catch (ex) {
      console.error(`Error: ${JSON.stringify(ex, null, 2)}`)
      throw new CookieArchivistError('commit', ex, 'unexpected')
    }
  }
}