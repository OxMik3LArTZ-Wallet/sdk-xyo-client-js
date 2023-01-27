import { Archivist } from '@xyo-network/archivist'
import { XyoBoundWitness } from '@xyo-network/boundwitness-model'
import { EmptyObject } from '@xyo-network/core'
import { AbstractModule, AbstractModuleConfig } from '@xyo-network/module'

import { XyoPayloadWithMeta, XyoPayloadWithPartialMeta } from '../Payload'
import { XyoPayloadFilterPredicate } from './XyoPayloadFilterPredicate'

export type PayloadArchivist<T extends EmptyObject = EmptyObject, TConfig extends AbstractModuleConfig = AbstractModuleConfig> = Archivist<
  XyoPayloadWithMeta<T> | null,
  XyoBoundWitness | null,
  XyoPayloadWithPartialMeta<T>,
  XyoPayloadWithMeta<T> | null,
  XyoPayloadFilterPredicate<T>,
  string
> &
  AbstractModule<TConfig>