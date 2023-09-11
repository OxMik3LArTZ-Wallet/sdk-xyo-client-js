import { HDWallet } from '@xyo-network/account'
import { MemoryArchivist } from '@xyo-network/archivist'
import { MemoryPayloadDiviner, PayloadDiviner } from '@xyo-network/diviner-payload'
import { PayloadDivinerConfigSchema } from '@xyo-network/diviner-payload-model'
import { ImageThumbnail, ImageThumbnailSchema } from '@xyo-network/image-thumbnail-payload-plugin'
import { MemoryNode } from '@xyo-network/node-memory'
import { UrlPayload, UrlSchema } from '@xyo-network/url-payload-plugin'
import hasbin from 'hasbin'

import { ImageThumbnailDiviner, ImageThumbnailDivinerConfigSchema } from '../Diviner'

// eslint-disable-next-line import/no-named-as-default-member
const describeIfHasBin = (bin: string) => (hasbin.sync(bin) ? describe : describe.skip)

describeIfHasBin('magick')('ImageThumbnailWitness', () => {
  let node: MemoryNode
  let diviner: ImageThumbnailDiviner
  let payloadDiviner: PayloadDiviner
  let archivist: MemoryArchivist
  let thumbnailPayload: ImageThumbnail
  beforeAll(async () => {
    node = await MemoryNode.create({ account: await HDWallet.random() })
    archivist = await MemoryArchivist.create({ account: await HDWallet.random() })
    await node.register(archivist)
    await node.attach(archivist.address, true)

    payloadDiviner = await MemoryPayloadDiviner.create({
      account: await HDWallet.random(),
      config: { archivist: archivist.address, schema: PayloadDivinerConfigSchema },
    })
    await node.register(payloadDiviner)
    await node.attach(payloadDiviner.address, true)

    diviner = await ImageThumbnailDiviner.create({
      account: await HDWallet.random(),
      config: { archivist: archivist.address, payloadDiviner: payloadDiviner.address, schema: ImageThumbnailDivinerConfigSchema },
    })
    await node.register(diviner)
    await node.attach(diviner.address, true)

    thumbnailPayload = {
      schema: ImageThumbnailSchema,
      sourceUrl: 'https://pickaxes.coinapp.co/images/1101018010121/full',
      url: 'data:image/png;base64,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',
    }
    await archivist.insert([thumbnailPayload])
  })
  it('Good Url', async () => {
    const nodeModules = await node.resolve()
    expect(nodeModules.length).toBe(4)
    const divinerModules = await diviner.resolve()
    expect(divinerModules.length).toBe(4)
    const goodUrlPayload: UrlPayload = {
      schema: UrlSchema,
      url: thumbnailPayload.sourceUrl,
    }
    const result = (await diviner.divine([goodUrlPayload])) as ImageThumbnail[]
    expect(result.length).toBe(1)
    expect(result[0].url?.length).toBeLessThan(64000)
    expect(result[0].schema).toBe(ImageThumbnailSchema)
  })
  it('Bad Url', async () => {
    const nodeModules = await node.resolve()
    expect(nodeModules.length).toBe(4)
    const divinerModules = await diviner.resolve()
    expect(divinerModules.length).toBe(4)
    const badUrlPayload: UrlPayload = {
      schema: UrlSchema,
      url: 'https://cnn.com',
    }
    const result = (await diviner.divine([badUrlPayload])) as ImageThumbnail[]
    expect(result.length).toBe(0)
  })
})
