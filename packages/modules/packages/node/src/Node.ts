import { Module, ModuleResolver } from '@xyo-network/module-model'
import { Promisable } from '@xyo-network/promise'

export interface Node {
  attach(address: string, name?: string): void
  attached(): Promisable<string[]>
  detach(address: string): void
  registered(): Promisable<string[]>
}

export type NodeModule<TModule extends Module = Module> = Node & Module & ModuleResolver<TModule>
