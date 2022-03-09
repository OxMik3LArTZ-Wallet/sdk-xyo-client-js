import { assertEx } from '@xylabs/sdk-js'
import axios, { AxiosRequestConfig } from 'axios'

import { XyoDomainConfig } from '../DomainConfig'
import { Huri } from '../Huri'
import { XyoBoundWitness, XyoPayload } from '../models'
import { XyoArchivistApiConfig } from './ArchivistApiConfig'
import { getArchivistApiResponseTransformer } from './ArchivistApiResponseTransformer'
import { ArchiveKeyResponse, ArchiveResponse, PutArchiveRequest } from './models'

class XyoArchivistApi {
  public config: XyoArchivistApiConfig
  constructor(config: XyoArchivistApiConfig) {
    this.config = config
  }

  private get axios() {
    return this.config.axios ?? axios
  }

  private get axiosRequestConfig(): AxiosRequestConfig {
    return {
      headers: this.headers,
      transformResponse: getArchivistApiResponseTransformer(),
    }
  }

  public get archive() {
    return this.config.archive
  }

  public get authenticated() {
    return !!this.config.apiKey || !!this.config.jwtToken
  }

  public get headers(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.config.jwtToken) {
      headers.Authorization = `Bearer ${this.config.jwtToken}`
    }
    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey
    }
    return headers
  }

  public async getDomainConfig(domain: string) {
    return (await this.axios.get<XyoDomainConfig>(`${this.config.apiDomain}/domain/${domain}`, this.axiosRequestConfig))
      .data
  }

  public async getArchives() {
    return (await this.axios.get<ArchiveResponse[]>(`${this.config.apiDomain}/archive`, this.axiosRequestConfig)).data
  }

  public async getArchive(archive: string) {
    return (
      await this.axios.get<ArchiveResponse>(`${this.config.apiDomain}/archive/${archive}`, this.axiosRequestConfig)
    ).data
  }

  public async putArchive(archive: string, data: PutArchiveRequest = { accessControl: false }) {
    return (
      await this.axios.put<ArchiveResponse>(
        `${this.config.apiDomain}/archive/${archive}`,
        data,
        this.axiosRequestConfig
      )
    ).data
  }

  public async getArchiveKeys() {
    return (
      await this.axios.get<ArchiveKeyResponse[]>(
        `${this.config.apiDomain}/archive/${this.config.archive}/settings/keys`,
        this.axiosRequestConfig
      )
    ).data
  }

  public async postArchiveKey() {
    return (
      await this.axios.post<ArchiveKeyResponse>(
        `${this.config.apiDomain}/archive/${this.config.archive}/settings/keys`,
        null,
        this.axiosRequestConfig
      )
    ).data
  }

  public async postBoundWitnesses(boundWitnesses: XyoBoundWitness[]) {
    return (
      await this.axios.post<{ boundWitnesses: number; payloads: number }>(
        `${this.config.apiDomain}/archive/${this.config.archive}/block`,
        { boundWitnesses },
        this.axiosRequestConfig
      )
    ).data
  }

  public async postBoundWitness(entry: XyoBoundWitness) {
    return await this.postBoundWitnesses([entry])
  }

  public async getBoundWitnessStats() {
    return (
      await this.axios.get<{ count: number }>(
        `${this.config.apiDomain}/archive/${this.config.archive}/block/stats`,
        this.axiosRequestConfig
      )
    ).data
  }

  public async getBoundWitnessByHash(hash: string) {
    return (
      await this.axios.get<XyoBoundWitness[]>(
        `${this.config.apiDomain}/archive/${this.config.archive}/block/hash/${hash}`,
        this.axiosRequestConfig
      )
    ).data
  }

  public async getBoundWitnessesBefore(timestamp: number, limit = 20) {
    assertEx(limit > 0, 'min limit = 1')
    assertEx(limit <= 100, 'max limit = 100')
    const params = { order: 'desc', timestamp }
    return (
      await this.axios.get<XyoBoundWitness[]>(`${this.config.apiDomain}/archive/${this.config.archive}/block`, {
        ...this.axiosRequestConfig,
        params,
      })
    ).data
  }

  public async getBoundWitnessesAfter(timestamp: number, limit = 20) {
    assertEx(limit > 0, 'min limit = 1')
    assertEx(limit <= 100, 'max limit = 100')
    const params = { order: 'asc', timestamp }
    return (
      await this.axios.get<XyoBoundWitness[]>(`${this.config.apiDomain}/archive/${this.config.archive}/block`, {
        ...this.axiosRequestConfig,
        params,
      })
    ).data
  }

  public async getBoundWitnessPayloadsByHash(hash: string) {
    return (
      await this.axios.get<XyoPayload[]>(
        `${this.config.apiDomain}/archive/${this.config.archive}/block/hash/${hash}/payloads`,
        this.axiosRequestConfig
      )
    ).data
  }

  public async getPayloadStats() {
    return (
      await this.axios.get<{ count: number }>(
        `${this.config.apiDomain}/archive/${this.config.archive}/payload/stats`,
        this.axiosRequestConfig
      )
    ).data
  }

  public async getPayloadByHash(hash: string) {
    return (
      await this.axios.get<XyoPayload[]>(
        `${this.config.apiDomain}/archive/${this.config.archive}/payload/hash/${hash}`,
        this.axiosRequestConfig
      )
    ).data
  }

  public async repairPayloadByHash(hash: string) {
    return (
      await this.axios.get<XyoPayload[]>(
        `${this.config.apiDomain}/archive/${this.config.archive}/payload/hash/${hash}/repair`,
        this.axiosRequestConfig
      )
    ).data
  }

  public async getBoundWitnessMostRecent(limit = 20) {
    assertEx(limit > 0, 'min limit = 1')
    assertEx(limit <= 100, 'max limit = 100')
    return (
      await this.axios.get<XyoBoundWitness[]>(
        `${this.config.apiDomain}/archive/${this.config.archive}/block/recent/${limit}`,
        this.axiosRequestConfig
      )
    ).data
  }

  public async getPayloadsMostRecent(limit = 20) {
    assertEx(limit > 0, 'min limit = 1')
    assertEx(limit <= 100, 'max limit = 100')
    return (
      await this.axios.get<XyoPayload[]>(
        `${this.config.apiDomain}/archive/${this.config.archive}/payload/recent/${limit}`,
        this.axiosRequestConfig
      )
    ).data
  }

  public async getBoundWitnessSample(size: number) {
    return (
      await this.axios.get<XyoBoundWitness[]>(
        `${this.config.apiDomain}/archive/${this.config.archive}/block/sample/${size}`,
        this.axiosRequestConfig
      )
    ).data
  }

  public async getPayloadSample(size: number) {
    return (
      await this.axios.get<XyoPayload[]>(
        `${this.config.apiDomain}/archive/${this.config.archive}/payload/sample/${size}`,
        this.axiosRequestConfig
      )
    ).data
  }

  public async fetch(huri: Huri | string) {
    const huriObj = typeof huri === 'string' ? new Huri(huri) : huri
    return (await this.axios.get<XyoPayload | XyoBoundWitness[]>(huriObj.href, this.axiosRequestConfig)).data
  }

  /**
   * @deprecated use constructor instead
   * */
  static get(config: XyoArchivistApiConfig) {
    return new XyoArchivistApi(config)
  }
}

export { XyoArchivistApi }
