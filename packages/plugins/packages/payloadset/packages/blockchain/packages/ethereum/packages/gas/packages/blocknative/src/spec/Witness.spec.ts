import { XyoEthereumGasBlocknativeSchema } from '@xyo-network/blocknative-ethereum-gas-payload-plugin'
import { PayloadWrapper } from '@xyo-network/payload-wrapper'

import { XyoEthereumGasBlocknativeWitnessConfigSchema } from '../Schema'
import { XyoEthereumGasBlocknativeWitness } from '../Witness'

describe('XyoEthereumGasBlocknativeWitness', () => {
  it('returns observation', async () => {
    const sut = await XyoEthereumGasBlocknativeWitness.create({
      config: {
        schema: XyoEthereumGasBlocknativeWitnessConfigSchema,
      },
    })
    const [actual] = await sut.observe()
    expect(actual.timestamp).toBeNumber()
    expect(actual.schema).toBe(XyoEthereumGasBlocknativeSchema)
    const answerWrapper = PayloadWrapper.wrap(actual)
    expect(await answerWrapper.getValid()).toBe(true)
  })
})
