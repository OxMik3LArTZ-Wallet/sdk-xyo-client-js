import { MemoryNode } from '@xyo-network/modules'
import { Payload } from '@xyo-network/payload-model'
import { MemorySentinel, SentinelConfig, SentinelConfigSchema } from '@xyo-network/sentinel'
import { AdhocWitness, AdhocWitnessConfigSchema } from '@xyo-network/witnesses'

import { getAccount, WalletPaths } from '../../Account'
import { getArchivists } from '../../Archivists'

export const reportDivinerResult = async (payload: Payload): Promise<Payload[]> => {
  const account = getAccount(WalletPaths.CryptoMarketDivinerResultPanel)
  const archivists = await getArchivists()
  const witnesses = [await AdhocWitness.create({ account, config: { payload, schema: AdhocWitnessConfigSchema } })]
  const modules = [...archivists, ...witnesses]
  const node = await MemoryNode.create()
  await Promise.all(
    modules.map(async (mod) => {
      await node.register(mod).attach(mod.address)
    }),
  )
  const config: SentinelConfig = {
    archivists: archivists.map((mod) => mod.address),
    schema: SentinelConfigSchema,
    witnesses: witnesses.map((mod) => mod.address),
  }
  const sentinel = await MemorySentinel.create({ account, config })
  const report = await sentinel.report()
  return report
}