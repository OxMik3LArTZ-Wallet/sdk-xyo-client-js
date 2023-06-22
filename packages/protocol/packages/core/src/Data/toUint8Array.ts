import { base16, base58 } from '@scure/base'
import { assertEx } from '@xylabs/assert'
import { BigNumber } from '@xylabs/bignumber'
import { Buffer } from '@xylabs/buffer'
import { ifTypeOf } from '@xyo-network/typeof'

import { AbstractData } from './AbstractData'
import { DataLike } from './DataLike'

const stringToUint8Array = (value: string, base = 16) => {
  switch (base) {
    case 16:
      return base16.decode((value.startsWith('0x') ? value.slice(2) : value).toUpperCase())
    case 58:
      return base58.decode(value)
    default:
      throw Error(`Unsupported base [${base}]`)
  }
}

const bigNumberToUint8Array = (value: BigNumber) => {
  //we do new BigNumber in case we got something BigNumberish by accident
  return bufferToUint8Array(Buffer.from(new BigNumber(value).toBuffer()))
}

const bufferToUint8Array = (value: Buffer) => {
  return Uint8Array.from(value)
}

const xyoDataToUint8Array = (value: AbstractData) => {
  return value.bytes
}

export const toUint8ArrayOptional = (value?: DataLike, padLength?: number, base?: number): Uint8Array | undefined => {
  return value ? toUint8Array(value, padLength, base) : undefined
}

export const toUint8Array = (value: DataLike, padLength?: number, base?: number): Uint8Array => {
  let result: Uint8Array | undefined =
    ifTypeOf<string, Uint8Array>('string', value as string, (value) => stringToUint8Array(value, base)) ??
    ifTypeOf<BigNumber, Uint8Array | undefined>('object', value as BigNumber, bigNumberToUint8Array, BigNumber.isBN) ??
    ifTypeOf<Buffer, Uint8Array | undefined>('object', value as Buffer, bufferToUint8Array, Buffer.isBuffer) ??
    ifTypeOf<AbstractData, Uint8Array | undefined>('object', value as Buffer, xyoDataToUint8Array, AbstractData.is) ??
    (value as Uint8Array)

  if (padLength && result.length < padLength) {
    result = new Uint8Array([...new Uint8Array(padLength - result.length), ...result])
    assertEx(result?.length <= padLength, 'Resulting length is greater than padLength')
  }

  return result
}
