import { assertEx } from '@xylabs/assert'
import { BoundWitnessWrapper } from '@xyo-network/boundwitness-wrapper'
import { Query, QueryBoundWitness } from '@xyo-network/module-model'
import { Payload, PayloadSetPayload } from '@xyo-network/payload-model'
import { PayloadWrapper } from '@xyo-network/payload-wrapper'

import { QueryBoundWitnessValidator } from './QueryBoundWitnessValidator'

export class QueryBoundWitnessWrapper<T extends Query = Query> extends BoundWitnessWrapper<QueryBoundWitness> {
  private _query: PayloadWrapper<T> | undefined
  private _resultSet: PayloadWrapper<PayloadSetPayload> | undefined

  private isQueryBoundWitnessWrapper = true

  static parseQuery<T extends Query = Query>(obj: unknown, payloads?: Payload[]): QueryBoundWitnessWrapper<T> {
    assertEx(!Array.isArray(obj), 'Array can not be converted to QueryBoundWitnessWrapper')
    switch (typeof obj) {
      case 'object': {
        const castWrapper = obj as QueryBoundWitnessWrapper<T>
        const wrapper = castWrapper?.isQueryBoundWitnessWrapper ? castWrapper : new QueryBoundWitnessWrapper<T>(obj as QueryBoundWitness, payloads)
        /*if (!wrapper.valid) {
          console.warn(`Parsed invalid QueryBoundWitness ${JSON.stringify(wrapper.errors.map((error) => error.message))}`)
        }*/
        return wrapper
      }
    }
    throw Error(`Unable to parse [${typeof obj}]`)
  }

  override getErrors() {
    return new QueryBoundWitnessValidator(this.boundwitness).validate()
  }

  async getQuery() {
    return assertEx(
      (this._query =
        this._query ?? (await this.payloadMap())[this.boundwitness.query]
          ? ((await this.payloadMap())[this.boundwitness.query] as PayloadWrapper<T>)
          : undefined),
      () => `Missing Query [${this.boundwitness}, ${JSON.stringify(this.payloads, null, 2)}]`,
    )
  }

  async getResultSet() {
    const resultSetHash = this.boundwitness.resultSet
    return assertEx(
      (this._resultSet =
        this._resultSet ??
        (resultSetHash
          ? (await this.payloadMap())[resultSetHash]
            ? ((await this.payloadMap())[resultSetHash] as PayloadWrapper<PayloadSetPayload>)
            : undefined
          : undefined)),
      () => `Missing resultSet [${resultSetHash}, ${JSON.stringify(this.payloads, null, 2)}]`,
    )
  }
}
