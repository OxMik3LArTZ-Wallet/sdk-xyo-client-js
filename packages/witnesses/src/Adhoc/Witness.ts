import { XyoPayload, XyoSimpleWitness } from '@xyo-network/core'

export class XyoAdhocWitness extends XyoSimpleWitness<XyoPayload> {
  public payload: XyoPayload
  constructor(payload: XyoPayload) {
    super({
      schema: payload.schema,
      template: { schema: '' },
    })
    this.payload = payload
  }

  override async observe(): Promise<XyoPayload> {
    return await super.observe(this.payload)
  }
}
