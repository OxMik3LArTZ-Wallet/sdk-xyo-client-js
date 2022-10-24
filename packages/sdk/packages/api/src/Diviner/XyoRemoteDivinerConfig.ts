import { XyoDivinerConfig } from '@xyo-network/diviner'

import { XyoArchivistApi } from '../Archivist'

export type XyoRemoteDivinerConfigSchema = 'network.xyo.diviner.remote.config'
export const XyoRemoteDivinerConfigSchema: XyoRemoteDivinerConfigSchema = 'network.xyo.diviner.remote.config'

export type XyoRemoteDivinerConfig = XyoDivinerConfig & {
  api?: XyoArchivistApi
  archive?: string
  schema: XyoRemoteDivinerConfigSchema
}