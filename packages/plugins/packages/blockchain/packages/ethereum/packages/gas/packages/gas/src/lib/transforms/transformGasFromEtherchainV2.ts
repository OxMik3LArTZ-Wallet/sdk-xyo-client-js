import { parseUnits } from '@ethersproject/units'
import { XyoEthereumGasEtherchainV2Payload } from '@xyo-network/etherchain-gas-ethereum-blockchain-payload-plugins'

import { BaseFeeRange, GasRange, PriorityFeeRange, TransactionCosts } from '../../Model'
import { MinPriorityFee } from './PriorityFeeConstants'

const getGasRange = (payload: XyoEthereumGasEtherchainV2Payload): GasRange => {
  const { slow, standard, fast, rapid } = payload.data
  const low = parseUnits(slow.toString(), 'gwei').toNumber()
  const medium = parseUnits(standard.toString(), 'gwei').toNumber()
  const high = parseUnits(fast.toString(), 'gwei').toNumber()
  const veryHigh = parseUnits(rapid.toString(), 'gwei').toNumber()
  return { high, low, medium, veryHigh }
}

const getBaseFeeRange = (payload: XyoEthereumGasEtherchainV2Payload): BaseFeeRange => {
  const medium = parseUnits('0', 'gwei').toNumber()
  return { medium }
}

const getPriorityFeeRange = (payload: XyoEthereumGasEtherchainV2Payload): PriorityFeeRange => {
  const low = MinPriorityFee
  const medium = Math.max(parseUnits('0', 'gwei').toNumber(), low)
  return { low, medium }
}

export const transformGasFromEtherchainV2 = (payload: XyoEthereumGasEtherchainV2Payload): TransactionCosts => {
  const gas = getGasRange(payload)
  const baseFee = getBaseFeeRange(payload)
  const priorityFee = getPriorityFeeRange(payload)
  return { baseFee, gas, priorityFee }
}
