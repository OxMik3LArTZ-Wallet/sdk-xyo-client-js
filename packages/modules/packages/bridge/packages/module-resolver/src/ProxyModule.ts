import { assertEx } from '@xylabs/assert'
import { AddressPayload, AddressSchema } from '@xyo-network/address-payload-plugin'
import { BridgeModule } from '@xyo-network/bridge-model'
import { ModuleManifest } from '@xyo-network/manifest-model'
import {
  AddressPreviousHashPayload,
  BaseEmitter,
  CompositeModuleResolver,
  Module,
  ModuleConfig,
  ModuleDescription,
  ModuleEventData,
  ModuleFilter,
  ModuleParams,
  ModuleQueryResult,
  QueryBoundWitness,
} from '@xyo-network/module'
import { Payload } from '@xyo-network/payload-model'
import { Promisable } from '@xyo-network/promise'
import compact from 'lodash/compact'

export type ProxyModuleConfigSchema = 'network.xyo.module.proxy.config'
export const ProxyModuleConfigSchema: ProxyModuleConfigSchema = 'network.xyo.module.proxy.config'

export type TProxyModuleConfig = ModuleConfig<{ schema: ProxyModuleConfigSchema }>

export type ProxyModuleParams = ModuleParams<
  TProxyModuleConfig,
  {
    address: string
    bridge: BridgeModule
  }
>

export class ProxyModule extends BaseEmitter<ProxyModuleParams, ModuleEventData> implements Module<ModuleParams, ModuleEventData> {
  readonly upResolver = new CompositeModuleResolver()

  constructor(params: ProxyModuleParams) {
    super(params)
  }

  get address() {
    return this.params.address.toLowerCase()
  }

  get bridge() {
    return this.params.bridge
  }

  get config(): ModuleConfig {
    return this.bridge.targetConfig(this.address)
  }

  get downResolver() {
    return this.bridge.targetDownResolver(this.address)
  }

  get queries() {
    return this.bridge.targetQueries(this.address)
  }

  addressPreviousHash(): Promise<AddressPreviousHashPayload> {
    throw Error('Not Implemented')
  }

  async describe(): Promise<ModuleDescription> {
    const description: ModuleDescription = {
      address: this.address,
      queries: this.queries,
    }
    if (this.config.name) {
      description.name = this.config.name
    }

    const discover = await this.discover()

    description.children = compact(
      discover?.map((payload) => {
        const address = payload.schema === AddressSchema ? (payload as AddressPayload).address : undefined
        return address != this.address ? address : undefined
      }) ?? [],
    )

    return description
  }

  discover(): Promisable<Payload[]> {
    return this.bridge.targetDiscover()
  }

  manifest(): Promisable<ModuleManifest> {
    const name = assertEx(this.config.name, 'Calling manifest on un-named module is not supported')
    return { config: { name, ...this.config } }
  }

  previousHash(): Promise<string | undefined> {
    throw Error('Not Implemented')
  }

  async query<T extends QueryBoundWitness = QueryBoundWitness>(query: T, payloads?: Payload[]): Promise<ModuleQueryResult> {
    const result = assertEx(await this.bridge.targetQuery(this.address, query, payloads), 'Remote Query Failed')
    await this.emit('moduleQueried', { module: this, payloads, query, result })
    return result
  }

  async queryable(query: QueryBoundWitness, payloads?: Payload[], queryConfig?: ModuleConfig): Promise<boolean> {
    return await this.bridge.targetQueryable(this.address, query, payloads, queryConfig)
  }

  /* Resolves a filter from the perspective of the module, including through the parent/gateway module */
  async resolve(filter?: ModuleFilter): Promise<Module[]> {
    return await this.bridge.targetResolve(this.address, filter)
  }
}
