import { AccountInstance } from '@xyo-network/account-model'
import { BoundWitnessBuilder, BoundWitnessBuilderConfig } from '@xyo-network/boundwitness-builder'
import { BoundWitness } from '@xyo-network/boundwitness-model'
import { Payload } from '@xyo-network/payload-model'

import { unitTestSigningAccount } from '../Account'
import { getNewPayloads } from '../Payload'

const config: BoundWitnessBuilderConfig = { inlinePayloads: false, timestamp: true }

export const getNewBoundWitness = (
  signers: AccountInstance[] = [unitTestSigningAccount],
  payloads: Payload[] = getNewPayloads(1),
): Promise<[BoundWitness, Payload[]]> => {
  return new BoundWitnessBuilder(config).payloads(payloads).witnesses(signers).build()
}

export const getNewBoundWitnesses = (
  signers: AccountInstance[] = [unitTestSigningAccount],
  numBoundWitnesses = 1,
  numPayloads = 1,
): Promise<[BoundWitness, Payload[]][]> => {
  return Promise.all(new Array(numBoundWitnesses).fill(0).map(() => getNewBoundWitness(signers, getNewPayloads(numPayloads))))
}
