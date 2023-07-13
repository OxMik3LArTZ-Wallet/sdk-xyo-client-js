import { QueryBoundWitness } from '@xyo-network/boundwitness-builder'
import { EventData } from '@xyo-network/module-events'
import { Payload } from '@xyo-network/payload-model'

import { IndirectModule, ModuleEventArgs } from '../Module'
import { ModuleQueryResult } from '../ModuleQueryResult'

export type ModuleQueriedEventArgs = ModuleEventArgs<
  IndirectModule,
  {
    payloads?: Payload[]
    query: QueryBoundWitness
    result: ModuleQueryResult
  }
>

export interface ModuleQueriedEventData extends EventData {
  moduleQueried: ModuleQueriedEventArgs
}