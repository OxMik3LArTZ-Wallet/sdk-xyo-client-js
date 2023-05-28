import { InfuraProvider } from '@ethersproject/providers'
import { XyoEthereumGasEthersSchema } from '@xyo-network/ethers-ethereum-gas-payload-plugin'
import { PayloadWrapper } from '@xyo-network/payload-wrapper'

import { XyoEthereumGasEthersWitnessConfigSchema } from './Schema'
import { XyoEthereumGasEthersWitness } from './Witness'

const projectId = process.env.INFURA_PROJECT_ID || ''
const projectSecret = process.env.INFURA_PROJECT_SECRET || ''

import { testIf } from '@xylabs/jest-helpers'

describe('XyoEthereumGasEthersWitness', () => {
  testIf(projectId && projectSecret)('returns observation', async () => {
    const provider = new InfuraProvider('homestead', { projectId: process.env.INFURA_PROJECT_ID, projectSecret })
    const sut = await XyoEthereumGasEthersWitness.create({
      config: {
        schema: XyoEthereumGasEthersWitnessConfigSchema,
      },
      provider,
    })
    const [actual] = await sut.observe()
    expect(actual.timestamp).toBeNumber()
    expect(actual.schema).toBe(XyoEthereumGasEthersSchema)
    const answerWrapper = new PayloadWrapper(actual)
    expect(await answerWrapper.getValid()).toBe(true)
  })
})
