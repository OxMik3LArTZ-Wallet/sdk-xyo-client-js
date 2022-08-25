import { createXyoPayloadPlugin } from '@xyo-network/payload-plugin'

import { XyoLocationPayload } from './Payload'
import { XyoLocationPayloadSchema } from './Schema'
import { XyoLocationPayloadTemplate } from './Template'
import { XyoLocationWitness, XyoLocationWitnessConfig } from './Witness'

export const XyoLocationPayloadPlugin = () =>
  createXyoPayloadPlugin<XyoLocationPayload, XyoLocationWitnessConfig>({
    auto: true,
    schema: XyoLocationPayloadSchema,
    template: XyoLocationPayloadTemplate,
    witness: (config): XyoLocationWitness => {
      return new XyoLocationWitness(config)
    },
  })
