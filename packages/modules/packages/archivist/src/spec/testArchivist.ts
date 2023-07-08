/**
 * @jest-environment jsdom
 */

import { delay } from '@xylabs/delay'
import { ArchivistModule } from '@xyo-network/archivist-model'
import { ArchivistWrapper } from '@xyo-network/archivist-wrapper'
import { BoundWitnessWrapper } from '@xyo-network/boundwitness-wrapper'
import { PayloadHasher } from '@xyo-network/core'
import { Payload } from '@xyo-network/payload-model'
import { PayloadWrapper } from '@xyo-network/payload-wrapper'
import { IdSchema } from '@xyo-network/plugins'
import { Promisable } from '@xyo-network/promise'

export const testArchivistRoundTrip = (archivistPromise: Promisable<ArchivistModule>, name: string) => {
  test(`Archivist RoundTrip [${name}]`, async () => {
    const idPayload: Payload<{ salt: string }> = {
      salt: Date.now().toString(),
      schema: IdSchema,
    }
    const payloadWrapper = PayloadWrapper.wrap(idPayload)

    const archivist = await archivistPromise
    const insertResult = await archivist.insert([idPayload])
    const insertResultWrappers = insertResult.map((bw) => BoundWitnessWrapper.wrap(bw))
    const insertResultPayload = insertResultWrappers.pop() as BoundWitnessWrapper
    expect(insertResultPayload).toBeDefined()

    expect(PayloadHasher.find(insertResultPayload.payloadHashes, await payloadWrapper.hashAsync())).toBeDefined()
    const getResult = await archivist.get([await payloadWrapper.hashAsync()])
    expect(getResult).toBeDefined()
    expect(getResult.length).toBe(1)
    const gottenPayload = getResult[0]
    if (gottenPayload) {
      const gottenPayloadWrapper = PayloadWrapper.wrap(gottenPayload)
      expect(await gottenPayloadWrapper.hashAsync()).toBe(await payloadWrapper.hashAsync())
    }
  })
}

export const testArchivistAll = (archivist: Promisable<ArchivistModule>, name: string) => {
  test(`Archivist All [${name}]`, async () => {
    const idPayload = {
      salt: Date.now().toString(),
      schema: IdSchema,
    }
    const archivistWrapper = ArchivistWrapper.wrap(await archivist)
    for (let x = 0; x < 10; x++) {
      await archivistWrapper.insert([idPayload])
      await delay(10)
    }
    const getResult = await archivistWrapper.all()
    expect(getResult).toBeDefined()
    expect(getResult.length).toBe(2)
  })
}
