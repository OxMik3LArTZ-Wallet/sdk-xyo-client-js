import { Logger } from '@xyo-network/core'
import merge from 'lodash/merge'

import { CreatableModule, CreatableModuleFactory } from './CreatableModule'
import { IndirectModule } from './Module'

export class ModuleFactory<TModule extends IndirectModule> implements CreatableModuleFactory<TModule> {
  configSchemas: CreatableModuleFactory<TModule>['configSchemas']

  creatableModule: CreatableModule<TModule>

  defaultLogger?: Logger | undefined

  defaultParams?: TModule['params']

  constructor(creatableModule: CreatableModule<TModule>, params?: TModule['params']) {
    this.creatableModule = creatableModule
    this.defaultParams = params
    this.configSchemas = creatableModule.configSchemas
  }

  get configSchema(): string {
    return this.configSchemas[0]
  }

  static withParams<T extends IndirectModule>(creatableModule: CreatableModule<T>, params?: T['params']) {
    return new ModuleFactory(creatableModule, params)
  }

  create<T extends IndirectModule>(this: CreatableModuleFactory<T>, params?: TModule['params'] | undefined): Promise<T> {
    const factory = this as ModuleFactory<T>
    const schema = factory.creatableModule.configSchema
    const mergedParams: TModule['params'] = merge(factory.defaultParams ?? {}, params, { config: { schema } })
    return factory.creatableModule.create<T>(mergedParams)
  }

  factory<T extends IndirectModule>(this: CreatableModule<T>, _params?: T['params'] | undefined): CreatableModuleFactory<T> {
    throw new Error('Method not implemented.')
  }
}