import { assertEx } from '@xylabs/assert'
import { exists } from '@xylabs/exists'
import { fulfilled, rejected } from '@xylabs/promise'
import { AnyConfigSchema, duplicateModules, EventListener, Module, ModuleFilter, ModuleWrapper } from '@xyo-network/module'
import { NodeConfig, NodeConfigSchema, NodeModule, NodeModuleEventData, NodeModuleParams } from '@xyo-network/node-model'
import { NodeWrapper } from '@xyo-network/node-wrapper'
import compact from 'lodash/compact'

import { AbstractNode } from './AbstractNode'

export type MemoryNodeParams = NodeModuleParams<AnyConfigSchema<NodeConfig>>

export class MemoryNode<TParams extends MemoryNodeParams = MemoryNodeParams, TEventData extends NodeModuleEventData = NodeModuleEventData>
  extends AbstractNode<TParams, TEventData>
  implements NodeModule<TParams, TEventData>
{
  static override configSchemas = [NodeConfigSchema]

  private registeredModuleMap: Record<string, Module> = {}

  override async attach(nameOrAddress: string, external?: boolean) {
    return (await this.attachUsingAddress(nameOrAddress, external)) ?? (await this.attachUsingName(nameOrAddress, external))
  }

  override async detach(nameOrAddress: string) {
    return (await this.detachUsingAddress(nameOrAddress)) ?? (await this.detachUsingName(nameOrAddress))
  }

  override async register(module: Module) {
    assertEx(!this.registeredModuleMap[module.address], `Module already registered at that address[${module.address}]`)
    this.registeredModuleMap[module.address] = module
    const args = { module, name: module.config.name }
    await this.emit('moduleRegistered', args)
    return this
  }

  override registered() {
    return Object.keys(this.registeredModuleMap).map((key) => {
      return key
    })
  }

  override registeredModules() {
    return Object.values(this.registeredModuleMap).map((value) => {
      return value
    })
  }

  override async unregister(module: Module) {
    await this.detach(module.address)
    delete this.registeredModuleMap[module.address]
    const args = { module, name: module.config.name }
    await this.emit('moduleUnregistered', args)
    return this
  }

  protected override async resolve<TModule extends Module = Module>(filter?: ModuleFilter): Promise<TModule[]> {
    const internal: Promise<TModule[]> = this.privateResolver.resolve<TModule>(filter)
    const up: Promise<TModule[]> = this.upResolver?.resolve<TModule>(filter) || []
    const down: Promise<TModule[]> = this.downResolver?.resolve<TModule>(filter) || []
    const resolved = await Promise.allSettled([internal, up, down])

    const errors = resolved.filter(rejected).map((r) => Error(r.reason))

    if (errors.length) {
      this.logger?.error(`Resolve Errors: ${JSON.stringify(errors, null, 2)}`)
    }

    return resolved
      .filter(fulfilled)
      .map((r) => r.value)
      .flat()
      .filter(exists)
      .filter(duplicateModules)
  }

  private async attachUsingAddress(address: string, external?: boolean) {
    const existingModule = (await this.resolve({ address: [address] })).pop()
    assertEx(!existingModule, `Module [${existingModule?.config.name ?? existingModule?.address}] already attached at address [${address}]`)
    const module = this.registeredModuleMap[address]

    if (!module) {
      return
    }

    const wrapper = ModuleWrapper.wrap(module)
    const notifiedAddresses: string[] = []

    const getModulesToNotifyAbout = async (node: ModuleWrapper) => {
      //send attach events for all existing attached modules
      const childModules = await node.resolve()
      return compact(
        childModules.map((child) => {
          //don't report self
          if (node.address === child.address) {
            return
          }

          //prevent loop
          if (notifiedAddresses.includes(child.address)) {
            return
          }

          notifiedAddresses.push(child.address)

          return child
        }),
      )
    }

    const notificationList = await getModulesToNotifyAbout(wrapper)

    this.privateResolver.addResolver(module.downResolver)

    //give it inside access
    module.upResolver.addResolver?.(this.privateResolver)

    //give it outside access
    module.upResolver.addResolver?.(this.upResolver)

    if (external) {
      //expose it externally
      this.downResolver.addResolver(module.downResolver)
    }

    const args = { module, name: module.config.name }
    await this.emit('moduleAttached', args)

    if (NodeWrapper.isNodeModule(module)) {
      if (external) {
        const wrappedAsNode = NodeWrapper.wrap(module as NodeModule)

        const attachedListener: EventListener<TEventData['moduleAttached']> = async (args: TEventData['moduleAttached']) =>
          await this.emit('moduleAttached', args)

        const detachedListener: EventListener<TEventData['moduleDetached']> = async (args: TEventData['moduleDetached']) =>
          await this.emit('moduleDetached', args)

        wrappedAsNode.on('moduleAttached', attachedListener)
        wrappedAsNode.on('moduleDetached', detachedListener)
      }
    }

    const notifyOfExistingModules = async (childModules: Module[]) => {
      await Promise.all(
        childModules.map(async (child) => {
          const args = { module: child, name: child.config.name }
          await this.emit('moduleAttached', args)
        }),
      )
    }

    await notifyOfExistingModules(notificationList)

    return address
  }

  private async attachUsingName(name: string, external?: boolean) {
    const address = this.moduleAddressFromName(name)
    if (address) {
      return await this.attachUsingAddress(address, external)
    }
  }

  private async detachUsingAddress(address: string) {
    const module = this.registeredModuleMap[address]

    if (!module) {
      return
    }

    this.privateResolver.removeResolver(module.downResolver)

    //remove inside access
    module.upResolver?.removeResolver?.(this.privateResolver)

    //remove outside access
    module.upResolver?.removeResolver?.(this.upResolver)

    //remove external exposure
    this.downResolver.removeResolver(module.downResolver)

    const args = { module, name: module.config.name }
    await this.emit('moduleDetached', args)

    //notify of all sub node children detach
    const wrapper = ModuleWrapper.tryWrap(module as NodeModule)
    const notifiedAddresses: string[] = []
    if (wrapper) {
      const notifyOfExistingModules = async (node: ModuleWrapper) => {
        //send attach events for all existing attached modules
        const childModules = await node.resolve()
        await Promise.all(
          childModules.map(async (child) => {
            //don't report self
            if (node.address === child.address) {
              return
            }

            //prevent loop
            if (notifiedAddresses.includes(child.address)) {
              return
            }
            notifiedAddresses.push(child.address)
            await this.emit('moduleDetached', { module: child })
          }),
        )
      }
      await notifyOfExistingModules(wrapper)
    }
    return address
  }

  private async detachUsingName(name: string) {
    const address = this.moduleAddressFromName(name)
    if (address) {
      return await this.detachUsingAddress(address)
    }
    return
  }

  private moduleAddressFromName(name: string) {
    const address = Object.values(this.registeredModuleMap).find((value) => {
      return value.config.name === name
    }, undefined)?.address
    return address
  }
}
