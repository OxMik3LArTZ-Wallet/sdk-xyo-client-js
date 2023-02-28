import { XyoBoundWitnessSchema } from '@xyo-network/boundwitness-model'
import { MemoryNode } from '@xyo-network/node'
import { IdSchema, IdWitness, IdWitnessConfigSchema } from '@xyo-network/plugins'
import { AbstractWitness } from '@xyo-network/witness'

import { AbstractSentinel } from '../AbstractSentinel'
import { SentinelAutomationSchema, SentinelIntervalAutomationPayload } from '../Automation'
import { SentinelConfig, SentinelConfigSchema } from '../Config'
import { OnSentinelRunnerTriggerResult, SentinelRunner } from '../SentinelRunner'

describe('SentinelRunner', () => {
  let sentinel: AbstractSentinel
  let config: SentinelConfig

  beforeEach(async () => {
    const node = await MemoryNode.create()
    const witnessModules: AbstractWitness[] = [await IdWitness.create({ config: { salt: 'test', schema: IdWitnessConfigSchema } })]
    const witnesses = await Promise.all(
      witnessModules.map(async (witness) => {
        await node.register(witness).attach(witness.address)
        return witness.address
      }),
    )

    config = {
      schema: SentinelConfigSchema,
      witnesses,
    }

    sentinel = await AbstractSentinel.create({ config })
    await node.register(sentinel).attach(sentinel.address)
  })

  it('should output interval results', async () => {
    const intervalAutomation: SentinelIntervalAutomationPayload = {
      frequency: 1,
      frequencyUnits: 'minute',
      remaining: 1,
      schema: SentinelAutomationSchema,
      start: Date.now() - 1,
      type: 'interval',
      witnesses: config.witnesses,
    }
    const onTriggerResult: OnSentinelRunnerTriggerResult = (results) => {
      expect(results.length).toBe(2)
      expect(results[0]?.schema).toBe(XyoBoundWitnessSchema)
      expect(results[1].length).toBe(1)
      expect(results[1]?.[0].schema).toBe(IdSchema)
    }

    const runner = new SentinelRunner(sentinel, [intervalAutomation], onTriggerResult)
    await runner.start()
  })
})
