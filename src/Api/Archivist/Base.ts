import { Axios, AxiosResponse } from 'axios'

import { XyoArchivistApiConfig } from './Config'
import { XyoApiEnvelope } from './models'

export class XyoArchivistApiBase<C extends XyoArchivistApiConfig = XyoArchivistApiConfig> {
  public config: C
  public axios: Axios

  constructor(config: C) {
    this.config = config
    this.axios = new Axios({
      headers: {
        ...this.headers,
        'Content-Encoding': 'gzip',
      },
      responseType: 'json',
      transformResponse: (data) => JSON.parse(data),
    })
  }

  protected get root() {
    return this.config.root ?? '/'
  }

  private resolveRoot() {
    return `${this.config.apiDomain}${this.root}`
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async getEndpoint<T = any, D = any>(endPoint = '') {
    return (
      await this.axios.get<XyoApiEnvelope<T>, AxiosResponse<XyoApiEnvelope<T>>, D>(`${this.resolveRoot()}${endPoint}`)
    ).data.data
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async postEndpoint<T = any, D = any>(endPoint = '', data?: D) {
    return (
      await this.axios.post<XyoApiEnvelope<T>, AxiosResponse<XyoApiEnvelope<T>>, D>(
        `${this.resolveRoot()}${endPoint}`,
        data
      )
    ).data.data
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected async putEndpoint<T = any, D = any>(endPoint = '', data?: D) {
    return (
      await this.axios.put<XyoApiEnvelope<T>, AxiosResponse<XyoApiEnvelope<T>>, D>(
        `${this.resolveRoot()}${endPoint}`,
        data
      )
    ).data.data
  }

  protected get headers(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.config.jwtToken) {
      headers.Authorization = `Bearer ${this.config.jwtToken}`
    }
    if (this.config.apiKey) {
      headers['x-api-key'] = this.config.apiKey
    }
    return headers
  }

  public get authenticated() {
    return !!this.config.apiKey || !!this.config.jwtToken
  }
}
