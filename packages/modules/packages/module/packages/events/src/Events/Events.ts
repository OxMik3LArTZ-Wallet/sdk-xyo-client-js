import { assertEx } from '@xylabs/assert'
import { forget } from '@xylabs/forget'

import { EventAnyListener, EventArgs, EventData, EventFunctions, EventListener, EventName } from '../model'

/**
Emittery can collect and log debug information.

To enable this feature set the `DEBUG` environment variable to `emittery` or `*`. Additionally, you can set the static `isDebugEnabled` variable to true on the Emittery class, or `myEmitter.debug.enabled` on an instance of it for debugging a single instance.

See API for more information on how debugging works.
*/
export type DebugLogger<TEventData extends EventData, TName extends keyof TEventData> = (
  type: string,
  debugName: string,
  eventName?: TName,
  eventData?: TEventData[TName],
) => void

/**
Configure debug options of an instance.
*/
export type DebugOptions<TEventData extends EventData> = {
  enabled?: boolean
  logger?: DebugLogger<TEventData, keyof TEventData>
  readonly name: string
}

/**
Configuration options for Emittery.
*/
export type Options<TEventData extends EventData> = {
  readonly debug?: DebugOptions<TEventData>
}

const resolvedPromise = Promise.resolve()

export type MetaEventData<TEventData extends EventData> = {
  listenerAdded: {
    eventName?: keyof TEventData
    listener: EventListener<TEventData[keyof TEventData]> | EventAnyListener<TEventData[keyof TEventData]>
  }
  listenerRemoved: {
    eventName?: keyof TEventData
    listener: EventListener<TEventData[keyof TEventData]> | EventAnyListener<TEventData[keyof TEventData]>
  }
}

let canEmitMetaEvents = false
let isGlobalDebugEnabled = false

function assertEventName(eventName: EventName) {
  if (typeof eventName !== 'string' && typeof eventName !== 'symbol' && typeof eventName !== 'number') {
    throw new TypeError('`eventName` must be a string, symbol, or number')
  }
}

function assertListener(listener: object) {
  if (typeof listener !== 'function') {
    throw new TypeError('listener must be a function')
  }
}

const isMetaEvent = (eventName: EventName) => eventName === 'listenerAdded' || eventName === 'listenerRemoved'

export class Events<TEventData extends EventData = EventData> implements EventFunctions<TEventData> {
  static anyMap = new WeakMap<object, Set<EventAnyListener>>()
  static eventsMap = new WeakMap<object, Map<EventName, Set<EventListener>>>()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug?: DebugOptions<any>

  constructor(options: Options<TEventData> = {}) {
    Events.anyMap.set(this, new Set<EventAnyListener>())
    Events.eventsMap.set(this, new Map<keyof TEventData, Set<EventListener>>())

    this.debug = options.debug

    if (this.debug) {
      this.debug.enabled = !!this.debug.enabled

      this.debug.logger =
        this.debug.logger ??
        ((type: string, debugName: string, eventName?: keyof TEventData, eventData?: TEventData[keyof TEventData]) => {
          let eventDataString: string
          let eventNameString: string | undefined
          try {
            // TODO: Use https://github.com/sindresorhus/safe-stringify when the package is more mature. Just copy-paste the code.
            eventDataString = JSON.stringify(eventData)
          } catch {
            eventDataString = `Object with the following keys failed to stringify: ${Object.keys(eventData ?? {}).join(',')}`
          }

          if (typeof eventName === 'symbol' || typeof eventName === 'number') {
            eventNameString = eventName.toString()
          } else {
            eventNameString = eventName
          }

          const currentTime = new Date()
          const logTime = `${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}.${currentTime.getMilliseconds()}`
          console.log(`[${logTime}][events:${type}][${debugName}] Event Name: ${eventNameString}\n\tdata: ${eventDataString}`)
        })
    }
  }

  static get isDebugEnabled() {
    // In a browser environment, `globalThis.process` can potentially reference a DOM Element with a `#process` ID,
    // so instead of just type checking `globalThis.process`, we need to make sure that `globalThis.process.env` exists.

    if (typeof globalThis.process?.env !== 'object') {
      return isGlobalDebugEnabled
    }

    const { env } = globalThis.process ?? { env: {} }
    return env.DEBUG === 'emittery' || env.DEBUG === '*' || isGlobalDebugEnabled
  }

  static set isDebugEnabled(newValue) {
    isGlobalDebugEnabled = newValue
  }

  clearListeners(eventNames: keyof TEventData | (keyof TEventData)[]) {
    const eventNamesArray = Array.isArray(eventNames) ? eventNames : [eventNames]

    for (const eventName of eventNamesArray) {
      this.logIfDebugEnabled('clear', eventName, undefined)

      if (typeof eventName === 'string' || typeof eventName === 'symbol' || typeof eventName === 'number') {
        const set = this.getListeners(eventName)
        if (set) {
          set.clear()
        }
      } else {
        Events.anyMap.get(this)?.clear()

        for (const [eventName, listeners] of assertEx(Events.eventsMap.get(this)).entries()) {
          listeners.clear()
          Events.eventsMap.get(this)?.delete(eventName)
        }
      }
    }
  }

  async emit<TEventName extends keyof TEventData = keyof TEventData, TEventArgs extends TEventData[TEventName] = TEventData[TEventName]>(
    eventName: TEventName,
    eventArgs: TEventArgs,
  ) {
    await this.emitInternal(eventName, eventArgs)
  }

  async emitMetaEvent<
    TEventName extends keyof MetaEventData<TEventData> = keyof MetaEventData<TEventData>,
    TEventArgs extends MetaEventData<TEventData>[TEventName] = MetaEventData<TEventData>[TEventName],
  >(eventName: TEventName, eventArgs: TEventArgs) {
    if (isMetaEvent(eventName)) {
      try {
        canEmitMetaEvents = true
        await this.emitMetaEventInternal(eventName, eventArgs)
      } finally {
        canEmitMetaEvents = false
      }
    }
  }

  async emitSerial<TEventName extends keyof TEventData = keyof TEventData, TEventArgs extends TEventData[TEventName] = TEventData[TEventName]>(
    eventName: TEventName,
    eventArgs: TEventArgs,
  ) {
    assertEventName(eventName)

    if (isMetaEvent(eventName) && !canEmitMetaEvents) {
      throw new TypeError('`eventName` cannot be meta event `listenerAdded` or `listenerRemoved`')
    }

    this.logIfDebugEnabled('emitSerial', eventName, eventArgs)

    const listeners = this.getListeners(eventName) ?? new Set()
    const anyListeners = assertEx(Events.anyMap.get(this))
    const staticListeners = [...listeners]
    const staticAnyListeners = [...anyListeners]

    await resolvedPromise

    for (const listener of staticListeners) {
      if (listeners.has(listener)) {
        await listener(eventArgs)
      }
    }

    for (const listener of staticAnyListeners) {
      if (anyListeners.has(listener)) {
        await listener(eventName, eventArgs)
      }
    }
  }

  getListeners(eventName: keyof TEventData) {
    const events = assertEx(Events.eventsMap.get(this))
    if (!events.has(eventName)) {
      return
    }

    return events.get(eventName)
  }

  listenerCount(eventNames: keyof TEventData | (keyof TEventData)[]) {
    const eventNamesArray = Array.isArray(eventNames) ? eventNames : [eventNames]
    let count = 0

    for (const eventName of eventNamesArray) {
      if (typeof eventName === 'string') {
        count += assertEx(Events.anyMap.get(this)).size + (this.getListeners(eventName)?.size ?? 0)

        continue
      }

      if (typeof eventName !== 'undefined') {
        assertEventName(eventName)
      }

      count += assertEx(Events.anyMap.get(this)).size

      for (const value of assertEx(Events.eventsMap.get(this)).values()) {
        count += value.size
      }
    }

    return count
  }

  logIfDebugEnabled<TEventName extends EventName, TEventArgs extends EventArgs>(type: string, eventName?: TEventName, eventArgs?: TEventArgs) {
    if (Events.isDebugEnabled || this.debug?.enabled) {
      this.debug?.logger?.(type, this.debug.name, eventName, eventArgs)
    }
  }

  off<TEventName extends keyof TEventData = keyof TEventData, TEventArgs extends TEventData[TEventName] = TEventData[TEventName]>(
    eventNames: TEventName | TEventName[],
    listener: EventListener<TEventArgs>,
  ) {
    assertListener(listener)

    const eventNamesArray = Array.isArray(eventNames) ? eventNames : [eventNames]
    for (const eventName of eventNamesArray) {
      assertEventName(eventName)
      const set = this.getListeners(eventName) as Set<EventListener<TEventArgs>>
      if (set) {
        set.delete(listener)
        if (set.size === 0) {
          const events = Events.eventsMap.get(this)
          events?.delete(eventName)
        }
      }

      this.logIfDebugEnabled('unsubscribe', eventName, undefined)

      if (!isMetaEvent(eventName)) {
        forget(this.emitMetaEvent('listenerRemoved', { eventName, listener: listener as EventListener }))
      }
    }
  }

  offAny<TEventArgs extends TEventData[keyof TEventData] = TEventData[keyof TEventData]>(listener: EventAnyListener<TEventArgs>) {
    assertListener(listener)

    this.logIfDebugEnabled('unsubscribeAny', undefined, undefined)

    const typedMap = Events.anyMap.get(this) as Set<EventAnyListener<TEventArgs>>
    typedMap?.delete(listener)
    forget(this.emitMetaEvent('listenerRemoved', { listener: listener as EventAnyListener }))
  }

  on<TEventName extends keyof TEventData = keyof TEventData, TEventArgs extends TEventData[TEventName] = TEventData[TEventName]>(
    eventNames: TEventName | TEventName[],
    listener: EventListener<TEventArgs>,
  ) {
    assertListener(listener)

    const eventNamesArray = Array.isArray(eventNames) ? eventNames : [eventNames]
    for (const eventName of eventNamesArray) {
      assertEventName(eventName)
      let set = this.getListeners(eventName)
      if (!set) {
        set = new Set()
        const events = Events.eventsMap.get(this)
        events?.set(eventName, set)
      }

      set.add(listener as EventListener)

      this.logIfDebugEnabled('subscribe', eventName, undefined)

      if (!isMetaEvent(eventName)) {
        forget(this.emitMetaEvent('listenerAdded', { eventName, listener: listener as EventListener }))
      }
    }

    return this.off.bind(this, eventNames, listener as EventListener)
  }

  onAny<TEventArgs extends TEventData[keyof TEventData] = TEventData[keyof TEventData]>(listener: EventAnyListener<TEventArgs>) {
    assertListener(listener)

    this.logIfDebugEnabled('subscribeAny', undefined, undefined)

    Events.anyMap.get(this)?.add(listener as EventAnyListener)
    forget(this.emitMetaEvent('listenerAdded', { listener: listener as EventAnyListener }))
    return this.offAny.bind(this, listener as EventAnyListener)
  }

  once<TEventName extends keyof TEventData = keyof TEventData, TEventArgs extends TEventData[TEventName] = TEventData[TEventName]>(
    eventName: TEventName,
    listener: EventListener<TEventArgs>,
  ) {
    const subListener = async (args: TEventArgs) => {
      this.off(eventName, subListener)
      await listener(args)
    }
    this.on(eventName, subListener)
    return this.off.bind(this, eventName, subListener as EventListener)
  }

  private async emitInternal<TEventName extends keyof TEventData, TEventArgs extends TEventData[TEventName]>(
    eventName: TEventName,
    eventArgs: TEventArgs,
  ) {
    assertEventName(eventName)

    if (isMetaEvent(eventName) && !canEmitMetaEvents) {
      throw new TypeError('`eventName` cannot be meta event `listenerAdded` or `listenerRemoved`')
    }

    this.logIfDebugEnabled('emit', eventName, eventArgs)

    const listeners = this.getListeners(eventName) ?? new Set()
    const anyListeners = assertEx(Events.anyMap.get(this))
    const staticListeners = [...listeners]
    const staticAnyListeners = isMetaEvent(eventName) ? [] : [...anyListeners]

    await resolvedPromise
    await Promise.all([
      ...staticListeners.map(async (listener) => {
        if (listeners.has(listener)) {
          return await listener(eventArgs)
        }
      }),
      ...staticAnyListeners.map(async (listener) => {
        if (anyListeners.has(listener)) {
          return await listener(eventName, eventArgs)
        }
      }),
    ])
  }

  private async emitMetaEventInternal<TEventName extends keyof MetaEventData<TEventData>, TEventArgs extends MetaEventData<TEventData>[TEventName]>(
    eventName: TEventName,
    eventArgs: TEventArgs,
  ) {
    assertEventName(eventName)

    if (isMetaEvent(eventName) && !canEmitMetaEvents) {
      throw new TypeError('`eventName` cannot be meta event `listenerAdded` or `listenerRemoved`')
    }

    this.logIfDebugEnabled('emit', eventName, eventArgs)

    const listeners = this.getListeners(eventName) ?? new Set()
    const anyListeners = assertEx(Events.anyMap.get(this))
    const staticListeners = [...listeners]
    const staticAnyListeners = isMetaEvent(eventName) ? [] : [...anyListeners]

    await resolvedPromise
    await Promise.all([
      ...staticListeners.map(async (listener) => {
        if (listeners.has(listener)) {
          return await listener(eventArgs)
        }
      }),
      ...staticAnyListeners.map(async (listener) => {
        if (anyListeners.has(listener)) {
          return await listener(eventName, eventArgs)
        }
      }),
    ])
  }
}