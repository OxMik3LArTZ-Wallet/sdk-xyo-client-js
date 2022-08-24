import { XyoValidator } from '@xyo-network/core'
import { XyoPayload, XyoPayloadSchema, XyoPayloadWrapper } from '@xyo-network/payload'

import { createXyoPayloadPlugin } from './createPlugin'
import { XyoPayloadPlugin } from './Plugin'

export class XyoPayloadPluginResolver {
  protected pluginMap = new Map<string, XyoPayloadPlugin>()
  protected defaultPlugin: XyoPayloadPlugin

  constructor(
    /** @param plugins The initial set of plugins */
    plugins?: XyoPayloadPlugin[],
    /** @param defaultPlugin Specifies the plugin to be used if no plugins resolve */
    defaultPlugin = createXyoPayloadPlugin<XyoPayload>({
      schema: XyoPayloadSchema,
    }),
  ) {
    plugins?.forEach((plugin) => this.register(plugin))
    this.defaultPlugin = defaultPlugin
  }
  schema = XyoPayloadSchema

  public register<T extends XyoPayloadPlugin>(plugin: T) {
    this.pluginMap.set(plugin.schema, plugin)
    return this
  }

  public resolve(schema?: string): XyoPayloadPlugin
  public resolve(payload: XyoPayload): XyoPayloadPlugin
  public resolve(value: XyoPayload | string | undefined): XyoPayloadPlugin {
    return value ? this.pluginMap.get(typeof value === 'string' ? value : value.schema) ?? this.defaultPlugin : this.defaultPlugin
  }

  public validate(payload: XyoPayload): XyoValidator<XyoPayload> | undefined {
    return this.resolve(payload).validate?.(payload)
  }

  public wrap(payload: XyoPayload): XyoPayloadWrapper<XyoPayload> | undefined {
    return this.resolve(payload).wrap?.(payload)
  }

  /** @description Create list of plugins, optionally filtered by ability to witness/divine */
  public plugins(type?: 'witness' | 'diviner') {
    const result: XyoPayloadPlugin[] = []
    this.pluginMap.forEach((value) => {
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
    this.pluginMap.forEach((value) => {
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