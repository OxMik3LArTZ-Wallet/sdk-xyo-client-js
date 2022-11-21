import { XyoPayload } from '@xyo-network/payload'

import { XyoEthereumGasBlocknativeSchema } from './Schema'

export type WithConfidence<T> = T & {
  confidence: number
}
export interface BaseFee {
  baseFee: number
}

export interface EstimatedPrice {
  maxFeePerGas: number
  maxPriorityFeePerGas: number
  price: number
}

export interface BlockPrice {
  baseFeePerGas: number
  blockNumber: number
  estimatedPrices: WithConfidence<EstimatedPrice>[]
  estimatedTransactionCount: number
}

export interface EthereumGasBlocknativeResponse {
  blockPrices: BlockPrice[]
  currentBlockNumber: number
  estimatedBaseFees: [
    {
      'pending+1': WithConfidence<BaseFee>[]
    },
    {
      'pending+2': WithConfidence<BaseFee>[]
    },
    {
      'pending+3': WithConfidence<BaseFee>[]
    },
    {
      'pending+4': WithConfidence<BaseFee>[]
    },
    {
      'pending+5': WithConfidence<BaseFee>[]
    },
  ]
  maxPrice: number
  msSinceLastBlock: number
  network: 'main'
  system: 'ethereum'
  unit: 'gwei'
}

export type XyoEthereumGasBlocknativePayload = XyoPayload<
  EthereumGasBlocknativeResponse & {
    schema: XyoEthereumGasBlocknativeSchema
    timestamp: number
  }
>
