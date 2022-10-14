import { XyoMemoryArchivist } from '@xyo-network/archivist'
import { BoundWitnessWrapper, XyoBoundWitnessSchema } from '@xyo-network/boundwitness'
import { XyoIdSchema, XyoIdWitness, XyoIdWitnessConfigSchema } from '@xyo-network/id-payload-plugin'
import { XyoModuleResolver } from '@xyo-network/module'
import { XyoNodeSystemInfoSchema, XyoNodeSystemInfoWitness, XyoNodeSystemInfoWitnessConfigSchema } from '@xyo-network/node-system-info-payload-plugin'
import { XyoWitness } from '@xyo-network/witness'
import { XyoAdhocWitness } from '@xyo-network/witnesses'

import { XyoPanel, XyoPanelConfig, XyoPanelConfigSchema } from './XyoPanel'

describe('XyoPanel', () => {
  test('all [simple panel send]', async () => {
    const archivist = new XyoMemoryArchivist()
    await archivist.start()

    const witnesses: XyoWitness[] = [
      await new XyoIdWitness({ config: { salt: 'test', schema: XyoIdWitnessConfigSchema, targetSchema: XyoIdSchema } }).start(),
      await new XyoNodeSystemInfoWitness({
        config: {
          nodeValues: {
            osInfo: '*',
          },
          schema: XyoNodeSystemInfoWitnessConfigSchema,
          targetSchema: XyoNodeSystemInfoSchema,
        },
      }).start(),
    ]

    const config: XyoPanelConfig = {
      archivists: [archivist.address],
      schema: XyoPanelConfigSchema,
      witnesses: witnesses.map((witness) => witness.address),
    }

    const resolver = new XyoModuleResolver()
    resolver.add(archivist)
    witnesses.forEach((witness) => resolver.add(witness))

    const panel = new XyoPanel({ config, resolver })
    await panel.start()
    expect(panel.archivists.length).toBe(1)
    expect(panel.witnesses.length).toBe(2)
    const adhocWitness = new XyoAdhocWitness({
      schema: 'network.xyo.test.array',
      testArray: [1, 2, 3],
      testBoolean: true,
      testNull: null,
      testNullObject: { t: null, x: undefined },
      testNumber: 5,
      testObject: { t: 1 },
      testSomeNullObject: { s: 1, t: null, x: undefined },
      testString: 'hi',
      testUndefined: undefined,
    })

    await adhocWitness.start()
    const adhocObserved = await adhocWitness.observe()

    expect(adhocObserved).toBeDefined()

    const report1Result = await panel.report([adhocWitness])
    const report1 = BoundWitnessWrapper.parse(report1Result[1][0])
    expect(report1.schemaName).toBe(XyoBoundWitnessSchema)
    expect(report1.payloadHashes.length).toBe(3)
    const report2 = BoundWitnessWrapper.parse((await panel.report())[1][0])
    expect(report2.schemaName).toBeDefined()
    expect(report2.payloadHashes.length).toBe(2)
    expect(report2.hash !== report1.hash).toBe(true)
    expect(report2.prev(panel.address)).toBeDefined()
    expect(report2.prev(panel.address)).toBe(report1.hash)
  })
})
