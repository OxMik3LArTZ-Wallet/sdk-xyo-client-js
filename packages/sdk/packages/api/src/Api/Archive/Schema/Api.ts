import { XyoPayload } from '@xyo-network/payload-model'

import { XyoApiBase } from '../../../Base'
import { XyoApiSimple } from '../../../Simple'

export class XyoArchivistArchiveSchemaApi extends XyoApiBase {
  private _recent?: XyoApiSimple<XyoPayload[]>
  /**
   * @deprecated Use module API
   */
  get recent(): XyoApiSimple<XyoPayload[]> {
    this._recent =
      this._recent ??
      new XyoApiSimple<XyoPayload[]>({
        ...this.config,
        root: `${this.root}recent/`,
      })
    return this._recent
  }
}
