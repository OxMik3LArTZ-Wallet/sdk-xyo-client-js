import { XyoModuleParams } from '@xyo-network/module'
import { XyoWitness } from '@xyo-network/witness'

import { XyoDomainWitnessConfig } from './Config'
import { XyoDomainPayload } from './Payload'
import { XyoDomainSchema } from './Schema'

export class XyoDomainWitness extends XyoWitness<XyoDomainPayload, XyoDomainWitnessConfig> {
  static override async create(params?: XyoModuleParams<XyoDomainWitnessConfig>): Promise<XyoDomainWitness> {
    params?.logger?.debug(`params: ${JSON.stringify(params, null, 2)}`)
    const module = new XyoDomainWitness(params)
    await module.start()
    return module
  }

  override async observe(_payload: Partial<XyoDomainPayload>[]): Promise<XyoDomainPayload[]> {
    return await super.observe([{ schema: XyoDomainSchema }])
  }
  public static dmarc = '_xyo'

  public static generateDmarc(domain: string) {
    return `${XyoDomainWitness.dmarc}.${domain}`
  }
}
