import { assertEx } from '@xylabs/assert'
import { Account } from '@xyo-network/account'
import { AddressPayload, AddressSchema } from '@xyo-network/address-payload-plugin'
import { BoundWitnessBuilder } from '@xyo-network/boundwitness-builder'
import { XyoBoundWitness } from '@xyo-network/boundwitness-model'
import {
  AbstractModuleConfig,
  AbstractModuleDiscoverQuerySchema,
  AbstractModuleQuery,
  AbstractModuleSubscribeQuerySchema,
  Module,
  ModuleDescription,
  ModuleQueryResult,
  ModuleResolver,
  SchemaString,
  XyoQuery,
  XyoQueryBoundWitness,
} from '@xyo-network/module-model'
import { XyoPayloadBuilder } from '@xyo-network/payload-builder'
import { XyoPayload } from '@xyo-network/payload-model'
import { PayloadWrapper } from '@xyo-network/payload-wrapper'
import { Promisable, PromiseEx } from '@xyo-network/promise'
import { QueryPayload, QuerySchema } from '@xyo-network/query-payload-plugin'
import { Logger } from '@xyo-network/shared'
import compact from 'lodash/compact'

import { creatable } from './CreatableModule'
import { XyoErrorBuilder } from './Error'
import { serializableField } from './lib'
import { Logging } from './Logging'
import { ModuleParams } from './ModuleParams'
import { QueryBoundWitnessBuilder, QueryBoundWitnessWrapper } from './Query'
import { ModuleConfigQueryValidator, Queryable, SupportedQueryValidator } from './QueryValidator'

@creatable()
export class AbstractModule<TConfig extends AbstractModuleConfig = AbstractModuleConfig> implements Module {
  static configSchema: string
  static defaultLogger?: Logger

  public config: TConfig

  protected _resolver?: ModuleResolver
  protected _started = false
  protected account: Account
  protected readonly logger?: Logging
  protected readonly moduleConfigQueryValidator: Queryable
  protected readonly supportedQueryValidator: Queryable

  protected constructor(params: ModuleParams<TConfig>) {
    this.resolver = params.resolver
    this.config = params.config
    this.account = this.loadAccount(params?.account)
    this.supportedQueryValidator = new SupportedQueryValidator(this).queryable
    this.moduleConfigQueryValidator = new ModuleConfigQueryValidator(params?.config).queryable
    const activeLogger = params?.logger ?? AbstractModule.defaultLogger
    this.logger = activeLogger ? new Logging(activeLogger, `0x${this.account.addressValue.hex}`) : undefined
    this.logger?.log(`Resolver: ${!!this.resolver}, Logger: ${!!this.logger}`)
  }

  public get address() {
    return this.account.addressValue.hex
  }

  public get resolver(): ModuleResolver | undefined {
    return this._resolver
  }
  public set resolver(v: ModuleResolver | undefined) {
    this._resolver = v
  }

  static async create(params?: Partial<ModuleParams<AbstractModuleConfig>>): Promise<AbstractModule> {
    params?.logger?.debug(`config: ${JSON.stringify(params.config, null, 2)}`)
    const actualParams: Partial<ModuleParams<AbstractModuleConfig>> = params ?? {}
    actualParams.config = params?.config ?? { schema: assertEx(this.configSchema) }
    return await new this(actualParams as ModuleParams<AbstractModuleConfig>).start()
  }

  public description(): Promisable<ModuleDescription> {
    return { address: this.address, queries: this.queries() }
  }

  public discover(_queryAccount?: Account): Promisable<XyoPayload[]> {
    const config = this.config
    const address = new XyoPayloadBuilder<AddressPayload>({ schema: AddressSchema }).fields({ address: this.address }).build()
    const queries = this.queries().map((query) => {
      return new XyoPayloadBuilder<QueryPayload>({ schema: QuerySchema }).fields({ query }).build()
    })
    return compact([config, address, ...queries])
  }

  public queries(): string[] {
    return [AbstractModuleDiscoverQuerySchema, AbstractModuleSubscribeQuerySchema]
  }

  public async query<T extends XyoQueryBoundWitness = XyoQueryBoundWitness, TConfig extends AbstractModuleConfig = AbstractModuleConfig>(
    query: T,
    payloads?: XyoPayload[],
    queryConfig?: TConfig,
  ): Promise<ModuleQueryResult> {
    this.started('throw')
    const wrapper = QueryBoundWitnessWrapper.parseQuery<AbstractModuleQuery>(query, payloads)
    const typedQuery = wrapper.query.payload
    assertEx(this.queryable(query, payloads, queryConfig))
    const resultPayloads: XyoPayload[] = []
    const queryAccount = new Account()
    try {
      switch (typedQuery.schema) {
        case AbstractModuleDiscoverQuerySchema: {
          resultPayloads.push(...(await this.discover(queryAccount)))
          break
        }
        case AbstractModuleSubscribeQuerySchema: {
          this.subscribe(queryAccount)
          break
        }
        default:
          console.error(`Unsupported Query [${query.schema}]`)
      }
    } catch (ex) {
      const error = ex as Error
      resultPayloads.push(new XyoErrorBuilder([wrapper.hash], error.message).build())
    }
    return this.bindResult(resultPayloads, queryAccount)
  }

  public queryable<T extends XyoQueryBoundWitness = XyoQueryBoundWitness, TConfig extends AbstractModuleConfig = AbstractModuleConfig>(
    query: T,
    payloads?: XyoPayload[],
    queryConfig?: TConfig,
  ): boolean {
    if (!this.started('warn')) return false
    const configValidator = queryConfig
      ? new ModuleConfigQueryValidator(Object.assign({}, this.config, queryConfig)).queryable
      : this.moduleConfigQueryValidator
    const validators = [this.supportedQueryValidator, configValidator]
    return validators.every((validator) => validator(query, payloads))
  }

  public started(notStartedAction?: 'error' | 'throw' | 'warn' | 'log' | 'none') {
    if (!this._started) {
      switch (notStartedAction) {
        case 'throw':
          throw Error(`Module not Started [${this.address}]`)
        case 'warn':
          this.logger?.warn('Module not started')
          break
        case 'error':
          this.logger?.error('Module not started')
          break
        case 'none':
          break
        case 'log':
        default:
          this.logger?.log('Module not started')
      }
    }
    return this._started
  }

  public subscribe(_queryAccount?: Account) {
    return
  }

  protected bindHashes(hashes: string[], schema: SchemaString[], account?: Account) {
    const promise = new PromiseEx((resolve) => {
      const result = this.bindHashesInternal(hashes, schema, account)
      resolve?.(result)
      return result
    }, account)
    return promise
  }

  protected bindHashesInternal(hashes: string[], schema: SchemaString[], account?: Account): XyoBoundWitness {
    const builder = new BoundWitnessBuilder().hashes(hashes, schema).witness(this.account)
    const result = (account ? builder.witness(account) : builder).build()[0]
    this.logger?.debug(`result: ${JSON.stringify(result, null, 2)}`)
    return result
  }

  protected bindQuery<T extends XyoQuery | PayloadWrapper<XyoQuery>>(
    query: T,
    payloads?: XyoPayload[],
    account?: Account,
  ): PromiseEx<[XyoQueryBoundWitness, XyoPayload[]], Account> {
    const promise = new PromiseEx<[XyoQueryBoundWitness, XyoPayload[]], Account>((resolve) => {
      const result = this.bindQueryInternal(query, payloads, account)
      resolve?.(result)
      return result
    }, account)
    return promise
  }

  protected bindQueryInternal<T extends XyoQuery | PayloadWrapper<XyoQuery>>(
    query: T,
    payloads?: XyoPayload[],
    account?: Account,
  ): [XyoQueryBoundWitness, XyoPayload[]] {
    const builder = new QueryBoundWitnessBuilder().payloads(payloads).witness(this.account).query(query)
    const result = (account ? builder.witness(account) : builder).build()
    this.logger?.debug(`result: ${JSON.stringify(result, null, 2)}`)
    return result
  }

  protected bindResult(payloads: XyoPayload[], account?: Account): PromiseEx<ModuleQueryResult, Account> {
    const promise = new PromiseEx<ModuleQueryResult, Account>((resolve) => {
      const result = this.bindResultInternal(payloads, account)
      resolve?.(result)
      return result
    }, account)
    return promise
  }

  protected bindResultInternal(payloads: XyoPayload[], account?: Account): ModuleQueryResult {
    const builder = new BoundWitnessBuilder().payloads(payloads).witness(this.account)
    const result: ModuleQueryResult = [(account ? builder.witness(account) : builder).build()[0], payloads]
    this.logger?.debug(`result: ${JSON.stringify(result, null, 2)}`)
    return result
  }

  protected loadAccount(account?: Account) {
    return account ?? new Account()
  }

  protected start(_timeout?: number): Promisable<this> {
    this.validateConfig()
    this._started = true
    return this
  }

  protected stop(_timeout?: number): Promisable<this> {
    this._started = false
    return this
  }

  protected validateConfig(config?: unknown, parents: string[] = []): boolean {
    return Object.entries(config ?? this.config ?? {}).reduce((valid, [key, value]) => {
      switch (typeof value) {
        case 'function':
          this.logger?.warn(`Fields of type function not allowed in config [${parents?.join('.')}.${key}]`)
          return false
        case 'object': {
          if (Array.isArray(value)) {
            return (
              value.reduce((valid, value) => {
                return this.validateConfig(value, [...parents, key]) && valid
              }, true) && valid
            )
          }

          if (!serializableField(value)) {
            this.logger?.warn(`Fields that are not serializable to JSON are not allowed in config [${parents?.join('.')}.${key}]`)
            return false
          }
          return value ? this.validateConfig(value, [...parents, key]) && valid : true
        }
        default:
          return valid
      }
    }, true)
  }
}