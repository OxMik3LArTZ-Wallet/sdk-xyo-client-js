import { XyoPayloadMeta, XyoPayloadWithPartialMeta } from '../../../models'
import { XyoBoundWitness } from '../XyoBoundWitness'

export type XyoBoundWitnessMeta = XyoPayloadMeta<{
  _payloads?: XyoPayloadWithPartialMeta[]
  _signatures?: string[]
  _source_ip?: string
  _user_agent?: string
}>

export type XyoBoundWitnessWithMeta<T = unknown> = T & XyoBoundWitnessMeta & XyoBoundWitness
export type XyoBoundWitnessWithPartialMeta<T = unknown> = T & Partial<XyoBoundWitnessMeta> & XyoBoundWitness
