/**
 * @jest-environment jsdom
 */

import { IdSchema } from '@xyo-network/id-payload-plugin'
import { Payload } from '@xyo-network/payload-model'
import { PayloadWrapper } from '@xyo-network/payload-wrapper'

import { IdWitness, IdWitnessConfigSchema } from '../Witness'

describe('IdWitness [Browser]', () => {
  test('observe', async () => {
    const witness = await IdWitness.create({
      config: { salt: 'test', schema: IdWitnessConfigSchema },
    })
    const [observation] = await witness.observe([{ salt: 'test', schema: IdSchema } as Payload])
    expect(observation.schema).toBe(IdSchema)
    expect(await new PayloadWrapper(observation).getValid()).toBe(true)
  })

  test('observe [no config]', async () => {
    const witness = await IdWitness.create()
    const [observation] = await witness.observe([{ salt: 'test', schema: IdSchema } as Payload])
    expect(observation.schema).toBe(IdSchema)
    expect(await new PayloadWrapper(observation).getValid()).toBe(true)
  })
})
