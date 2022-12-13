import { assertEx } from '@xylabs/assert'
import { ArchivistWrapper, PayloadArchivist, XyoArchivistGetQuery, XyoArchivistGetQuerySchema } from '@xyo-network/archivist'
import { ModuleParams } from '@xyo-network/module'
import { Huri, PayloadWrapper, XyoPayload } from '@xyo-network/payload'

import { XyoDivinerDivineQuerySchema } from '../../Queries'
import { AbstractPayloadDiviner } from '../AbstractPayloadDiviner'
import { XyoHuriPayload, XyoHuriSchema } from '../XyoHuriPayload'
import { XyoArchivistPayloadDivinerConfig, XyoArchivistPayloadDivinerConfigSchema } from './Config'

export class ArchivistPayloadDiviner extends AbstractPayloadDiviner<XyoArchivistPayloadDivinerConfig> {
  static override configSchema: XyoArchivistPayloadDivinerConfigSchema

  protected archivist?: PayloadArchivist | null

  static override async create(params?: ModuleParams<XyoArchivistPayloadDivinerConfig>): Promise<ArchivistPayloadDiviner> {
    return (await super.create(params)) as ArchivistPayloadDiviner
  }

  public async divine(payloads?: XyoPayload[]): Promise<XyoPayload[]> {
    const huriPayloads = assertEx(
      payloads?.filter((payload): payload is XyoHuriPayload => payload?.schema === XyoHuriSchema),
      `no huri payloads provided: ${JSON.stringify(payloads, null, 2)}`,
    )
    const hashes = huriPayloads.map((huriPayload) => huriPayload.huri.map((huri) => new Huri(huri).hash)).flat()
    const activeArchivist = this.archivist
    if (activeArchivist) {
      const queryPayload = PayloadWrapper.parse<XyoArchivistGetQuery>({ hashes, schema: XyoArchivistGetQuerySchema })
      const query = await this.bindQuery(queryPayload)
      return (await activeArchivist.query(query[0], query[1]))[1]
    }
    return []
  }

  override queries() {
    return [XyoDivinerDivineQuerySchema, ...super.queries()]
  }

  protected override async start() {
    await super.start()
    const configArchivistAddress = this.config?.archivist
    if (configArchivistAddress) {
      const resolvedArchivist: PayloadArchivist | null = configArchivistAddress
        ? (this.resolver?.resolve({ address: [configArchivistAddress] }) as unknown as PayloadArchivist[]).shift() ?? null
        : null
      if (resolvedArchivist) {
        this.archivist = resolvedArchivist ? new ArchivistWrapper(resolvedArchivist) : null
      }
    }
    return this
  }
}

/** @deprecated use ArchivistPayloadDiviner instead */
export class XyoArchivistPayloadDiviner extends ArchivistPayloadDiviner {}
