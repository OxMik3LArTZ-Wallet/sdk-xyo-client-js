import { assertEx } from '@xylabs/assert'
import { AxiosJson } from '@xyo-network/axios'
import { MemoryNode, NodeWrapper } from '@xyo-network/node'

import { HttpBridge } from '../HttpBridge'
import { HttpBridgeConfigSchema } from '../HttpBridgeConfig'

test('HttpBridge', async () => {
  const nodeUri = `${process.env.API_DOMAIN}` ?? 'http://localhost:8080'
  const memNode = await MemoryNode.create()

  const bridge = await HttpBridge.create({
    axios: new AxiosJson(),
    config: { nodeUri: `${nodeUri}/node`, schema: HttpBridgeConfigSchema, security: { allowAnonymous: true } },
  })

  const wrapper = NodeWrapper.wrap(assertEx((await bridge.resolve({ address: [bridge.rootAddress] }))?.pop(), 'Failed to resolve rootNode'))
  await memNode.register(wrapper.module).attach(wrapper?.address, true)
  const description = await wrapper.describe()
  expect(description.children).toBeArray()
  expect(description.children?.length).toBeGreaterThan(0)
  expect(description.queries).toBeArray()
  expect(description.queries?.length).toBeGreaterThan(0)

  // Works if you supply the known address for 'Archivist'
  //const [archivistByAddress] = await memNode.resolve({ address: ['461fd6970770e97d9f66c71658f4b96212581f0b'] })
  //expect(archivistByAddress).toBeDefined()

  // Fails to resolve
  const [archivistByName] = await memNode.resolve({ name: ['Archivist'] })
  expect(archivistByName).toBeDefined()
})
