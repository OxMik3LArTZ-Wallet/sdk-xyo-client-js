import { XyoApiEnvelope } from '@xyo-network/api-models'
import { axios, AxiosError } from '@xyo-network/axios'
import { isBrowser, PayloadHasher } from '@xyo-network/core'
import { DnsRecordType, domainResolve } from '@xyo-network/dns'
import { FetchedPayload, Huri, HuriOptions } from '@xyo-network/huri'
import { XyoNetworkPayload } from '@xyo-network/network'
import { PayloadWrapper } from '@xyo-network/payload-wrapper'
import reverse from 'lodash/reverse'

import { XyoAlias, XyoDomainPayload } from './Payload'

export interface XyoFetchedAlias extends FetchedPayload {
  alias: XyoAlias
}

export class XyoDomainPayloadWrapper<T extends XyoDomainPayload = XyoDomainPayload> extends PayloadWrapper<T> {
  aliases?: XyoFetchedAlias[] | null

  static async discover(reverseDomainName: string, proxy?: string) {
    const parts = reverseDomainName.split('.')
    for (let i = 2; i <= parts.length; i++) {
      const domainToCheck = reverse(parts.filter((_, index) => index < i)).join('.')
      return (await this.discoverDNSEntry(domainToCheck)) ?? (await this.discoverRootFile(domainToCheck, proxy))
    }
  }

  static async discoverDNSEntry(domain: string) {
    try {
      const hash = (await domainResolve(`_xyo.${domain}`, DnsRecordType.TXT))?.Answer?.[0]?.data
      if (hash) {
        const huri = new Huri(hash)
        const payload = (await huri.fetch()) as XyoDomainPayload
        if (payload) {
          return new XyoDomainPayloadWrapper(payload)
        }
      }
    } catch (ex) {
      console.log(`XyoDomainConfig dns reading error entry not found [${domain}]`)
    }
  }

  static async discoverRootFile(domain: string, proxy?: string) {
    return isBrowser() || proxy ? await this.discoverRootFileWithProxy(domain, proxy) : await this.discoverRootFileDirect(domain)
  }

  static async discoverRootFileDirect(domain: string) {
    try {
      const config = (await axios.get<XyoDomainPayload>(`https://${domain}/xyo-config.json`)).data
      return new XyoDomainPayloadWrapper(config)
    } catch (ex) {
      console.log(`XyoDomainConfig root file not found [${domain}]`)
    }
  }

  static async discoverRootFileWithProxy(domain: string, proxy = 'https://api.archivist.xyo.network/domain') {
    try {
      const requestUrl = `${proxy}/${domain.split('.').reverse().join('.')}`
      const config = (await axios.get<XyoApiEnvelope<XyoDomainPayload>>(requestUrl)).data.data
      return new XyoDomainPayloadWrapper(config)
    } catch (ex) {
      const error = ex as AxiosError
      console.log(`XyoDomainConfig root file not found using proxy [${domain}] [${error.code}]`)
    }
  }

  async fetch(networkSlug?: string) {
    await this.fetchAliases(networkSlug)
  }

  async fetchAliases(networkSlug?: string) {
    //set it to null to signify fetch ran
    this.aliases = null

    const archivistUri = await this.findArchivistUri(networkSlug)
    if (this.payload().aliases) {
      const fetchedAliases = await Promise.all(
        Object.entries(this.payload().aliases ?? {}).map(([, alias]) => {
          return this.fetchAlias(alias, { archivistUri })
        }),
      )
      //cast to XyoFetchedPayload[] after we filter out any null/undefined entries
      this.aliases = fetchedAliases.filter((alias) => alias) as XyoFetchedAlias[]
    }
  }

  private async fetchAlias(alias: XyoAlias, huriOptions?: HuriOptions): Promise<XyoFetchedAlias | null> {
    const huri = new Huri(alias.huri, huriOptions)
    const payload = await huri.fetch()
    return payload ? { alias, huri, payload: payload } : null
  }

  private async findArchivistUri(hash?: string): Promise<string | undefined> {
    return (await this.getNetwork(hash))?.nodes?.find((payload) => (payload.type === 'archivist' ? payload : undefined))?.uri
  }

  private async getNetwork(hash?: string): Promise<XyoNetworkPayload | undefined> {
    return hash ? await PayloadHasher.find(this.payload().networks, hash) : this.payload().networks?.[0]
  }
}
