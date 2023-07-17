import { QueryBoundWitness } from '@xyo-network/boundwitness-builder'
import { EventData } from '@xyo-network/module-events'
import { Payload } from '@xyo-network/payload-model'

import { Module, ModuleEventArgs } from '../Module'
import { ModuleQueryResult } from '../ModuleQueryResult'

export type ModuleQueriedEventArgs = ModuleEventArgs<
  Module,
  {
    payloads?: Payload[]
    query: QueryBoundWitness
    result: ModuleQueryResult
  }
>

export interface ModuleQueriedEventData extends EventData {
  moduleQueried: ModuleQueriedEventArgs
}
