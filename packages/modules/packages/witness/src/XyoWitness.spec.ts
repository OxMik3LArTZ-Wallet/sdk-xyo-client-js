import { Module, XyoModule } from '@xyo-network/module'

import { Witness } from './Witness'
import { XyoWitness } from './XyoWitness'
import { XyoWitnessWrapper } from './XyoWitnessWrapper'

test('XyoWitness', async () => {
  const witness = new XyoWitness({ schema: 'xyo.network.test.witness.config', targetSchema: 'xyo.network.test' })
  const witnessAsModule: Module = witness
  const witnessAsWitness: Witness = witness
  const witnessAsXyoModule: XyoModule = witness
  const wrapper = new XyoWitnessWrapper(witnessAsModule ?? witnessAsXyoModule ?? witnessAsWitness)

  const payload = await wrapper.observe()

  expect(payload?.schema).toBe('xyo.network.test')
})