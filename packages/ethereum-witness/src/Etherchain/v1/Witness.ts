import { XyoQueryWitness } from '@xyo-network/witnesses'

import { getV1GasFromEtherchain } from './getV1GasFromEtherchain'
import { XyoEthereumGasEtherchainPayloadV1, XyoEthereumGasEtherchainQueryPayloadV1 } from './Payload'

export class XyoEtherchainEthereumGasWitnessV1 extends XyoQueryWitness<XyoEthereumGasEtherchainPayloadV1, XyoEthereumGasEtherchainQueryPayloadV1> {
  override async observe(): Promise<XyoEthereumGasEtherchainPayloadV1> {
    const fields = await getV1GasFromEtherchain()
    return await super.observe({
      ...fields,
      timestamp: Date.now(),
    })
  }

  public static schema = 'network.xyo.blockchain.ethereum.gas.etherchain.v1'
}
