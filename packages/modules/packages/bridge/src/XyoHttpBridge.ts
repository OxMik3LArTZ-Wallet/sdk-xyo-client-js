import { assertEx } from '@xylabs/assert'
import { XyoAccount } from '@xyo-network/account'
import { XyoBoundWitness } from '@xyo-network/boundwitness'
import {
  ModuleQueryResult,
  QueryBoundWitnessWrapper,
  XyoModule,
  XyoModuleConfig,
  XyoModuleParams,
  XyoQuery,
  XyoQueryBoundWitness,
} from '@xyo-network/module'
import { XyoPayload, XyoPayloads } from '@xyo-network/payload'
import { Promisable } from '@xyo-network/promise'
import { Axios, AxiosError, AxiosRequestHeaders } from 'axios'

import { AxiosJson, AxiosJsonRequestConfig } from './AxiosJson'
import { BridgeModule } from './Bridge'
import { XyoBridgeConfig } from './Config'
import { XyoBridgeConnectQuerySchema, XyoBridgeDisconnectQuerySchema, XyoBridgeQuery } from './Queries'

export type XyoHttpBridgeConfigSchema = 'network.xyo.bridge.http.config'
export const XyoHttpBridgeConfigSchema: XyoHttpBridgeConfigSchema = 'network.xyo.bridge.http.config'

export type XyoHttpBridgeConfig = XyoBridgeConfig<{
  schema: XyoHttpBridgeConfigSchema
  headers?: AxiosRequestHeaders
  axios?: AxiosJsonRequestConfig
}>

export interface XyoHttpBridgeParams<TConfig extends XyoModuleConfig = XyoModuleConfig> extends XyoModuleParams<TConfig> {
  axios: Axios
}

export class XyoHttpBridge<TConfig extends XyoHttpBridgeConfig = XyoHttpBridgeConfig> extends XyoModule<TConfig> implements BridgeModule {
  private axios: AxiosJson

  constructor(params: XyoHttpBridgeParams<TConfig>) {
    super(params)
    this.axios = new AxiosJson(this.config?.axios)
  }

  public get nodeUri() {
    return assertEx(this.config?.nodeUri, 'Missing nodeUri')
  }

  public get targetAddress() {
    return this.config?.targetAddress
  }

  public get targetAddressString() {
    return this.targetAddress ?? ''
  }

  connect(): Promisable<boolean> {
    return true
  }

  disconnect(): Promisable<boolean> {
    return true
  }

  protected async forward(query: XyoQuery, payloads?: XyoPayload[]): Promise<[XyoBoundWitness, XyoPayloads]> {
    try {
      const boundQuery = this.bindQuery(query, payloads)
      const result = await this.axios.post<[XyoBoundWitness, XyoPayloads]>(`${this.nodeUri}/${this.address}`, [boundQuery, ...[query]])
      return result.data
    } catch (ex) {
      const error = ex as AxiosError
      console.log(`Error Status: ${error.status}`)
      console.log(`Error Cause: ${JSON.stringify(error.cause, null, 2)}`)
      throw error
    }
  }

  override async query<T extends XyoQueryBoundWitness = XyoQueryBoundWitness>(query: T, payloads?: XyoPayload[]): Promise<ModuleQueryResult> {
    const wrapper = QueryBoundWitnessWrapper.parseQuery<XyoBridgeQuery>(query, payloads)
    const typedQuery = wrapper.query.payload
    assertEx(this.queryable(typedQuery.schema, wrapper.addresses))
    const queryAccount = new XyoAccount()
    const resultPayloads: (XyoPayload | null)[] = []
    switch (typedQuery.schema) {
      case XyoBridgeConnectQuerySchema: {
        await this.connect()
        break
      }
      case XyoBridgeDisconnectQuerySchema: {
        await this.disconnect()
        break
      }
      default:
        if (super.queries().find((schema) => schema === typedQuery.schema)) {
          return super.query(query, payloads)
        } else {
          return this.forward(query, payloads)
        }
    }
    return this.bindResult(resultPayloads, queryAccount)
  }
}
