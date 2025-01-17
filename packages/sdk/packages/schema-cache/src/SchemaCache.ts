import { isAxiosError } from '@xyo-network/axios'
import { DomainPayloadWrapper } from '@xyo-network/domain-payload-plugin'
import { handleError } from '@xyo-network/error'
import { FetchedPayload } from '@xyo-network/huri'
import { SchemaPayload, SchemaSchema } from '@xyo-network/schema-payload-plugin'
import Ajv, { SchemaObject } from 'ajv'
import { LRUCache } from 'lru-cache'

import { Debounce } from './Debounce'
import { SchemaNameToValidatorMap } from './SchemaNameToValidatorMap'

const getSchemaNameFromSchema = (schema: SchemaObject) => {
  if (schema.$id) {
    return schema.$id
  }
}

export type SchemaCacheEntry = FetchedPayload<SchemaPayload>

export class SchemaCache<T extends SchemaNameToValidatorMap = SchemaNameToValidatorMap> {
  /**
   * Object representing `null` since LRU Cache types
   * only allow for types that derive from object
   */
  protected static readonly NULL: SchemaCacheEntry = { payload: { definition: {}, schema: SchemaSchema } }

  private static _instance?: SchemaCache

  onSchemaCached?: (name: string, entry: SchemaCacheEntry) => void
  proxy?: string

  private _cache = new LRUCache<string, SchemaCacheEntry>({ max: 500, ttl: 1000 * 60 * 5 })
  private _validators: T = {} as T

  //prevents double discovery
  private getDebounce = new Debounce()

  private constructor(proxy?: string) {
    this.proxy = proxy
  }

  static get instance() {
    if (!this._instance) {
      this._instance = new SchemaCache()
    }
    return this._instance
  }

  /**
   * A map of cached schema (by name) to payload validators for the schema. A schema
   * must be cached via `get('schema.name')` before it's validator can be used as
   * they are compiled dynamically at runtime upon retrieval.
   */
  get validators(): T {
    return this._validators
  }

  async get(schema?: string): Promise<SchemaCacheEntry | undefined | null> {
    if (schema) {
      await this.getDebounce.one(schema, async () => {
        // If we've never looked for it before, it will be undefined
        if (this._cache.get(schema) === undefined) {
          await this.fetchSchema(schema)
        }
      })
      const value = this._cache.get(schema)
      return value === SchemaCache.NULL ? null : value
    }
    return undefined
  }

  private cacheSchemaIfValid(entry: SchemaCacheEntry) {
    //only store them if they match the schema root
    if (entry.payload.definition) {
      const ajv = new Ajv({ strict: false })
      //check if it is a valid schema def
      const validator = ajv.compile(entry.payload.definition)
      const schemaName = getSchemaNameFromSchema(entry.payload.definition)
      if (schemaName) {
        this._cache.set(schemaName, entry)
        const key = schemaName as keyof T
        this._validators[key] = validator as unknown as T[keyof T]
        this.onSchemaCached?.(schemaName, entry)
      }
    }
  }

  private cacheSchemas(aliasEntries?: FetchedPayload[] | null) {
    aliasEntries
      ?.filter((entry) => entry.payload.schema === SchemaSchema)
      .forEach((entry) => {
        this.cacheSchemaIfValid(entry as SchemaCacheEntry)
      })
  }

  private async fetchSchema(schema: string) {
    try {
      const domain = await DomainPayloadWrapper.discover(schema, this.proxy)
      await domain?.fetch()
      this.cacheSchemas(domain?.aliases)

      //if it is still undefined, mark it as null (not found)
      if (this._cache.get(schema) === undefined) {
        this._cache.set(schema, SchemaCache.NULL)
      }
    } catch (ex) {
      //if failed, set it to NULL, TODO: Make an entry for an error to try again in the future?
      this._cache.set(schema, SchemaCache.NULL)
      if (isAxiosError(ex)) {
        console.log(`Axios Url: ${ex.response?.config.url}`)
      }
      handleError(ex, (error) => {
        console.error(`fetchSchema threw: ${error.message}`)
      })
    }
  }
}
