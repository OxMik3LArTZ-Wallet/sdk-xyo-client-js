import { assertEx } from '@xylabs/assert'
import { AccountInstance } from '@xyo-network/account-model'
import { NodeManifestPayload } from '@xyo-network/manifest-model'
import { AddressPreviousHashPayload, AnyConfigSchema, EventListener, Module, ModuleDescriptionPayload } from '@xyo-network/module'
import {
  DirectNodeModule,
  isNodeModule,
  NodeConfig,
  NodeConfigSchema,
  NodeModule,
  NodeModuleEventData,
  NodeModuleParams,
} from '@xyo-network/node-model'
import { Payload } from '@xyo-network/payload-model'
import compact from 'lodash/compact'

import { AbstractNode } from './AbstractNode'

export type MemoryNodeParams = NodeModuleParams<AnyConfigSchema<NodeConfig>>

export class MemoryNode<TParams extends MemoryNodeParams = MemoryNodeParams, TEventData extends NodeModuleEventData = NodeModuleEventData>
  extends AbstractNode<TParams, TEventData>
  implements DirectNodeModule<TParams, TEventData>
{
  static override configSchemas = [NodeConfigSchema]

  private registeredModuleMap: Record<string, Module> = {}

  override async attach(nameOrAddress: string, external?: boolean) {
    await this.started('throw')
    return (await this.attachUsingAddress(nameOrAddress, external)) ?? (await this.attachUsingName(nameOrAddress, external))
  }

  async describe(): Promise<ModuleDescriptionPayload> {
    await this.started('throw')
    return await super.describeHandler()
  }

  override async detach(nameOrAddress: string) {
    await this.started('throw')
    return (await this.detachUsingAddress(nameOrAddress)) ?? (await this.detachUsingName(nameOrAddress))
  }

  async discover(): Promise<Payload[]> {
    await this.started('throw')
    return await super.discoverHandler()
  }

  async manifest(): Promise<NodeManifestPayload> {
    await this.started('throw')
    return await super.manifestHandler()
  }

  async moduleAddress(): Promise<AddressPreviousHashPayload[]> {
    await this.started('throw')
    return await super.moduleAddressHandler()
  }

  override async register(module: Module) {
    await this.started('throw')
    assertEx(!this.registeredModuleMap[module.address], `Module already registered at that address[${module.address}]`)
    this.registeredModuleMap[module.address] = module
    const args = { module, name: module.config.name }
    await this.emit('moduleRegistered', args)
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

  subscribe(_queryAccount?: AccountInstance) {
    return super.subscribeHandler()
  }

  override async unregister(module: Module) {
    await this.started('throw')
    await this.detach(module.address)
    delete this.registeredModuleMap[module.address]
    const args = { module, name: module.config.name }
    await this.emit('moduleUnregistered', args)
    return this
  }

  protected override startHandler() {
    return super.startHandler()
  }

  private async attachUsingAddress(address: string, external?: boolean) {
    const existingModule = (await this.resolve({ address: [address] })).pop()
    assertEx(!existingModule, `Module [${existingModule?.config.name ?? existingModule?.address}] already attached at address [${address}]`)
    const module = this.registeredModuleMap[address]

    if (!module) {
      return
    }

    const notifiedAddresses: string[] = []

    const getModulesToNotifyAbout = async (node: Module) => {
      //send attach events for all existing attached modules
      const childModules = await node.downResolver.resolve()
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

    const notificationList = await getModulesToNotifyAbout(module)

    //give it private access
    module.upResolver.addResolver?.(this.privateResolver)

    //give it public access
    module.upResolver.addResolver?.(this.downResolver)

    //give it outside access
    module.upResolver.addResolver?.(this.upResolver)

    if (external) {
      //expose it externally
      this.downResolver.addResolver(module.downResolver)
    } else {
      this.privateResolver.addResolver(module.downResolver)
    }

    const args = { module, name: module.config.name }
    await this.emit('moduleAttached', args)

    if (isNodeModule(module)) {
      if (external) {
        const attachedListener: EventListener<TEventData['moduleAttached']> = async (args: TEventData['moduleAttached']) =>
          await this.emit('moduleAttached', args)

        const detachedListener: EventListener<TEventData['moduleDetached']> = async (args: TEventData['moduleDetached']) =>
          await this.emit('moduleDetached', args)

        module.on('moduleAttached', attachedListener)
        module.on('moduleDetached', detachedListener)
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

    //remove inside access
    module.upResolver?.removeResolver?.(this.privateResolver)

    //remove outside access
    module.upResolver?.removeResolver?.(this.upResolver)

    //remove external exposure
    this.downResolver.removeResolver(module.downResolver)

    const args = { module, name: module.config.name }
    await this.emit('moduleDetached', args)

    //notify of all sub node children detach
    const notifiedAddresses: string[] = []
    if (isNodeModule(module)) {
      const notifyOfExistingModules = async (node: NodeModule) => {
        //send attach events for all existing attached modules
        const childModules = await node.downResolver.resolve()
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
      await notifyOfExistingModules(module)
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
