import { XyoDomainSchema } from '@xyo-network/domain-payload-plugin'
import { XyoModuleParams } from '@xyo-network/module'
import { PayloadSetSchema } from '@xyo-network/payload'
import { createPayloadSetPlugin, PayloadSetWitnessPlugin } from '@xyo-network/payloadset-plugin'

import { XyoDomainWitnessConfig } from './Config'
import { XyoDomainWitness } from './Witness'

export const DomainPlugin = () =>
  createPayloadSetPlugin<PayloadSetWitnessPlugin<XyoModuleParams<XyoDomainWitnessConfig>>>(
    { required: { [XyoDomainSchema]: 1 }, schema: PayloadSetSchema },
    {
      witness: async (params) => {
        const result = await XyoDomainWitness.create(params)
        return result
      },
    },
  )