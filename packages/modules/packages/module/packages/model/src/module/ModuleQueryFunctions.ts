import { ModuleManifestPayload } from '@xyo-network/manifest-model'
import { Payload } from '@xyo-network/payload-model'
import { Promisable } from '@xyo-network/promise'

import { ModuleDescription } from '../ModuleDescription'
import { AddressPreviousHashPayload } from '../Queries'

export type ModuleQueryFunctions = {
  describe: () => Promise<ModuleDescription>
  discover: () => Promisable<Payload[]>
  manifest: (maxDepth?: number, ignoreAddresses?: string[]) => Promisable<ModuleManifestPayload>
  moduleAddress: () => Promisable<AddressPreviousHashPayload[]>
}
