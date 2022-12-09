/**
 * @jest-environment jsdom
 */

import { XyoBowserSystemInfoSchema } from '@xyo-network/bowser-system-info-payload-plugin'
import { PayloadWrapper } from '@xyo-network/payload'
import crypto from 'crypto'

import { XyoBowserSystemInfoWitnessConfigSchema } from './Config'
import { XyoBowserSystemInfoWitness } from './Witness'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cryptoPolyfill = (window: Window & typeof globalThis) => {
  window.crypto = window.crypto ?? {
    getRandomValues: (arr: []) => crypto.randomBytes(arr.length),
  }
}

cryptoPolyfill(window)

describe('XyoBowserSystemInfo', () => {
  test('observe', async () => {
    const witness = await XyoBowserSystemInfoWitness.create({
      config: {
        schema: XyoBowserSystemInfoWitnessConfigSchema,
      },
    })
    const [observation] = await witness.observe()
    expect(observation.schema).toBe(XyoBowserSystemInfoSchema)
    expect(new PayloadWrapper(observation).valid).toBe(true)
  })
  test('observe [no config]', async () => {
    const witness = await XyoBowserSystemInfoWitness.create()
    const [observation] = await witness.observe()
    expect(observation.schema).toBe(XyoBowserSystemInfoSchema)
    expect(new PayloadWrapper(observation).valid).toBe(true)
  })
})