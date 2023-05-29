import { PayloadSetPluginResolver } from '@xyo-network/payloadset-plugin'

import { XyoCoingeckoCryptoMarketPlugin } from '../Plugin'

describe('XyoCryptoMarketCoinGeckoPlugin', () => {
  test('Add to Resolver', async () => {
    const plugin = XyoCoingeckoCryptoMarketPlugin()
    const resolver = await new PayloadSetPluginResolver().register(plugin)
    expect(resolver.resolve(plugin.set)).toBeDefined()
  })
})
