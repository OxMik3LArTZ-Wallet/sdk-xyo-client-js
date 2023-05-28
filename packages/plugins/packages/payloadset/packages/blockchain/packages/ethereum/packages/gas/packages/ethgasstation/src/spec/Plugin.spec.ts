import { XyoEthereumGasEthgasstationSchema } from '@xyo-network/ethgasstation-ethereum-gas-payload-plugin'
import { PayloadSetPluginResolver } from '@xyo-network/payloadset-plugin'

import { XyoEthereumGasEthgasstationPlugin } from '../Plugin'
import { XyoEthereumGasEthgasstationWitness } from '../Witness'

describe('XyoEthereumGasEthgasstationPlugin', () => {
  test('Add to Resolver', async () => {
    const plugin = XyoEthereumGasEthgasstationPlugin()
    const resolver = await new PayloadSetPluginResolver().register(plugin, {
      config: { schema: XyoEthereumGasEthgasstationWitness.configSchema },
    })
    expect(resolver.resolve(plugin.set)).toBeObject()
    expect(resolver.witness(XyoEthereumGasEthgasstationSchema)).toBeObject()
  })
})
