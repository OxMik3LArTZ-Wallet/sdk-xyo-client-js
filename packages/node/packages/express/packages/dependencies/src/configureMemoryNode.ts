import { assertEx } from '@xylabs/assert'
import { exists } from '@xylabs/exists'
import { Account } from '@xyo-network/account'
import { ArchivistConfigSchema, ArchivistInsertQuerySchema, isArchivistInstance, withArchivistInstance } from '@xyo-network/archivist-model'
import { PayloadHasher } from '@xyo-network/core'
import {
  AddressHistoryDivinerConfigSchema,
  AddressSpaceDivinerConfigSchema,
  BoundWitnessDivinerConfigSchema,
  BoundWitnessStatsDivinerConfigSchema,
  PayloadDivinerConfigSchema,
  PayloadStatsDivinerConfigSchema,
  SchemaListDivinerConfigSchema,
  SchemaStatsDivinerConfigSchema,
} from '@xyo-network/diviner-models'
import { AnyConfigSchema, CreatableModuleDictionary, ModuleConfig } from '@xyo-network/module-model'
import { MemoryNode } from '@xyo-network/node'
import { TYPES } from '@xyo-network/node-core-types'
import { NodeConfigSchema, NodeInstance } from '@xyo-network/node-model'
import { PrometheusNodeWitnessConfigSchema } from '@xyo-network/prometheus-node-plugin'
import { Container } from 'inversify'

const config = { schema: NodeConfigSchema }

type ModuleConfigWithVisibility = [config: AnyConfigSchema<ModuleConfig>, visibility: boolean]

const archivists: ModuleConfigWithVisibility[] = [[{ schema: ArchivistConfigSchema }, true]]

const diviners: ModuleConfigWithVisibility[] = [
  [{ schema: AddressHistoryDivinerConfigSchema }, true],
  [{ schema: AddressSpaceDivinerConfigSchema }, true],
  [{ schema: BoundWitnessDivinerConfigSchema }, true],
  [{ schema: BoundWitnessStatsDivinerConfigSchema }, true],
  [{ schema: PayloadDivinerConfigSchema }, true],
  [{ schema: PayloadStatsDivinerConfigSchema }, true],
  [{ schema: SchemaListDivinerConfigSchema }, true],
  [{ schema: SchemaStatsDivinerConfigSchema }, true],
]
const witnesses: ModuleConfigWithVisibility[] = [[{ schema: PrometheusNodeWitnessConfigSchema }, true]] // TODO: If we set this to false the visible modules stop resolving

const configs: ModuleConfigWithVisibility[] = [...archivists, ...diviners, ...witnesses]

export const configureMemoryNode = async (container: Container, memoryNode?: NodeInstance, account = Account.randomSync()) => {
  const node: NodeInstance = memoryNode ?? (await MemoryNode.create({ account, config }))
  container.bind<NodeInstance>(TYPES.Node).toConstantValue(node)
  await addModulesToNodeByConfig(container, node, configs)
  const configHashes = process.env.CONFIG_HASHES
  if (configHashes) {
    const hashes = configHashes.split(',').filter(exists)
    if (hashes.length) {
      const configPayloads: Record<string, ModuleConfig> = {}
      const mods = await node.resolve({ query: [[ArchivistInsertQuerySchema]] }, { direction: 'down', identity: isArchivistInstance })
      for (const mod of mods) {
        await withArchivistInstance(mod, async (archivist) => {
          const payloads = await archivist.get(hashes)
          await Promise.all(
            payloads.map(async (payload) => {
              configPayloads[await PayloadHasher.hashAsync(assertEx(payload, 'Received null payload'))] = payload as ModuleConfig
            }),
          )
        })
      }
      const additionalConfigs = Object.values(configPayloads).map<ModuleConfigWithVisibility>((configPayload) => [configPayload, true])
      await addModulesToNodeByConfig(container, node, additionalConfigs)
    }
  }
}

const addModulesToNodeByConfig = async (container: Container, node: NodeInstance, configs: ModuleConfigWithVisibility[]) => {
  const creatableModuleDictionary = container.get<CreatableModuleDictionary>(TYPES.CreatableModuleDictionary)
  await Promise.all(configs.map(async ([config, visibility]) => await addModuleToNodeFromConfig(creatableModuleDictionary, node, config, visibility)))
}

const addModuleToNodeFromConfig = async (
  creatableModuleDictionary: CreatableModuleDictionary,
  node: NodeInstance,
  config: AnyConfigSchema<ModuleConfig>,
  visibility = true,
) => {
  const configModuleFactory = creatableModuleDictionary[config.schema]
  if (configModuleFactory) {
    const mod = await configModuleFactory.create({ config })
    const { address } = mod
    node.register(mod)
    await node.attach(address, visibility)
  }
}
