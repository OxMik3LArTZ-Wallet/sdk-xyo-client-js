import { assertEx } from '@xylabs/assert'
import { XyoValidator } from '@xyo-network/core'
import { PayloadWrapper, XyoPayload, XyoPayloadSchema } from '@xyo-network/payload'

import { createXyoPayloadPlugin } from './createPlugin'
import { XyoPayloadPlugin } from './Plugin'
import { XyoPayloadPluginParams } from './XyoPayloadPluginConfigs'

export class XyoPayloadPluginResolver {
  protected _plugins: Record<string, XyoPayloadPlugin> = {}
  protected params: Record<string, XyoPayloadPluginParams> = {}
  protected defaultPlugin: XyoPayloadPlugin

  constructor(
    /** @param plugins The initial set of plugins */
    plugins?: XyoPayloadPlugin<XyoPayload>[],
    /** @param defaultPlugin Specifies the plugin to be used if no plugins resolve */
    defaultPlugin = createXyoPayloadPlugin<XyoPayload>({
      schema: XyoPayloadSchema,
    }),
  ) {
    plugins?.forEach((plugin) => this.register(plugin))
    this.defaultPlugin = defaultPlugin
  }
  schema = XyoPayloadSchema

  public register<TPlugin extends XyoPayloadPlugin = XyoPayloadPlugin, TParams extends TPlugin['params'] = TPlugin['params']>(
    plugin: TPlugin,
    params?: TParams,
  ) {
    this._plugins[plugin.schema] = plugin
    this.params[plugin.schema] = params ?? { witness: {} }
    return this
  }

  public resolve(schema?: string): XyoPayloadPlugin
  public resolve(payload: XyoPayload): XyoPayloadPlugin
  public resolve(value: XyoPayload | string | undefined): XyoPayloadPlugin {
    return value ? this._plugins[typeof value === 'string' ? value : value.schema] ?? this.defaultPlugin : this.defaultPlugin
  }

  public validate(payload: XyoPayload): XyoValidator<XyoPayload> | undefined {
    return this.resolve(payload).validate?.(payload)
  }

  public wrap(payload: XyoPayload): PayloadWrapper<XyoPayload> | undefined {
    return this.resolve(payload).wrap?.(payload)
  }

  public witness(schema: string) {
    return this._plugins[schema]?.witness?.(assertEx(this.params[schema]?.witness, 'Config required for witness creation'))
  }

  public diviner(schema: string) {
    return this._plugins[schema]?.diviner?.(assertEx(this.params[schema]?.diviner, 'Config required for diviner creation'))
  }

  /** @description Create list of plugins, optionally filtered by ability to witness/divine */
  public plugins(type?: 'witness' | 'diviner') {
    const result: XyoPayloadPlugin[] = []
    Object.values(this._plugins).forEach((value) => {
      if (type === 'witness' && !value.witness) {
        return
      }
      if (type === 'diviner' && !value.diviner) {
        return
      }
      result.push(value)
    })
    return result
  }

  /** @description Create list of schema, optionally filtered by ability to witness/divine */
  public schemas(type?: 'witness' | 'diviner') {
    const result: string[] = []
    Object.values(this._plugins).forEach((value) => {
      if (type === 'witness' && !value.witness) {
        return
      }
      if (type === 'diviner' && !value.diviner) {
        return
      }
      result.push(value.schema)
    })
    return result
  }
}
