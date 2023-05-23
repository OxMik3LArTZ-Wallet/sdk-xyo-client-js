import { assertEx } from '@xylabs/assert'
import { Buffer } from '@xylabs/buffer'
import { AccountInstance } from '@xyo-network/account-model'
import { BoundWitness, BoundWitnessSchema } from '@xyo-network/boundwitness-model'
import { BoundWitnessWrapper } from '@xyo-network/boundwitness-wrapper'
import { Hasher, sortFields } from '@xyo-network/core'
import { PayloadWrapper } from '@xyo-network/payload'
import { Payload } from '@xyo-network/payload-model'
import { Logger } from '@xyo-network/shared'

export interface BoundWitnessBuilderConfig {
  /** Whether or not the payloads should be included in the metadata sent to and recorded by the ArchivistApi */
  readonly inlinePayloads?: boolean
  readonly meta?: boolean
  readonly timestamp?: boolean
}

export class BoundWitnessBuilder<TBoundWitness extends BoundWitness<{ schema: string }> = BoundWitness, TPayload extends Payload = Payload> {
  private _accounts: AccountInstance[] = []
  private _payloadHashes: string[] | undefined
  private _payloadSchemas: string[] | undefined
  private _payloads: TPayload[] = []
  private _timestamp = Date.now()

  constructor(readonly config: BoundWitnessBuilderConfig = { inlinePayloads: false }, protected readonly logger?: Logger) {}

  private get _payload_hashes(): string[] {
    return (
      this._payloadHashes ??
      this._payloads.map((payload) => {
        return assertEx(Hasher.hash(payload))
      })
    )
  }

  private get _payload_schemas(): string[] {
    return (
      this._payloadSchemas ??
      this._payloads.map((payload) => {
        return assertEx(payload.schema, () => this.missingSchemaMessage(payload))
      })
    )
  }

  async build(meta = false): Promise<[TBoundWitness, TPayload[]]> {
    const hashableFields = this.hashableFields()
    const _hash = BoundWitnessWrapper.hash(hashableFields)
    const ret: TBoundWitness = {
      ...hashableFields,
      _signatures: await this.signatures(_hash),
    }
    if (meta ?? this.config?.meta) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bwWithMeta = ret as any
      bwWithMeta._client = 'js'
      bwWithMeta._hash = _hash
      bwWithMeta._timestamp = this._timestamp
    }
    if (this.config.inlinePayloads) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyRet = ret as any
      //leaving this in here to prevent breaking code (for now)
      anyRet._payloads = this.inlinePayloads()
    }
    return [ret, this._payloads]
  }

  hashableFields(): TBoundWitness {
    const addresses = this._accounts.map((account) => account.addressValue.hex)
    const previous_hashes = this._accounts.map((account) => account.previousHash?.hex ?? null)
    const payload_hashes = assertEx(this._payload_hashes, 'Missing payload_hashes')
    const payload_schemas = assertEx(this._payload_schemas, 'Missing payload_schemas')
    const result: TBoundWitness = {
      addresses: assertEx(addresses, 'Missing addresses'),
      payload_hashes,
      payload_schemas,
      previous_hashes,
      schema: BoundWitnessSchema,
    } as TBoundWitness

    assertEx(result.payload_hashes?.length === result.payload_schemas?.length, 'Payload hash/schema mismatch')

    assertEx(!result.payload_hashes.reduce((inValid, hash) => inValid || !hash, false), 'nulls found in hashes')

    assertEx(!result.payload_schemas.reduce((inValid, schema) => inValid || !schema, false), 'nulls found in schemas')

    if (this.config.timestamp ?? true) {
      result.timestamp = this._timestamp
    }

    return result
  }

  hashes(hashes: string[], schema: string[]) {
    assertEx(this.payloads.length === 0, 'Can not set hashes when payloads already set')
    this._payloadHashes = hashes
    this._payloadSchemas = schema
    return this
  }

  payload(payload?: TPayload) {
    const unwrappedPayload = PayloadWrapper.unwrap<TPayload>(payload)
    assertEx(this._payloadHashes === undefined, 'Can not set payloads when hashes already set')
    if (unwrappedPayload) {
      this._payloads.push(assertEx(sortFields<TPayload>(unwrappedPayload)))
    }
    return this
  }

  payloads(payloads?: (TPayload | null)[]) {
    payloads?.forEach((payload) => {
      if (payload !== null) {
        this.payload(payload)
      }
    })
    return this
  }

  witness(account: AccountInstance) {
    this._accounts?.push(account)
    return this
  }

  witnesses(accounts: AccountInstance[]) {
    this._accounts?.push(...accounts)
    return this
  }

  protected async signatures(_hash: string) {
    return await Promise.all(this._accounts.map(async (account) => Buffer.from(await account.sign(Buffer.from(_hash, 'hex'))).toString('hex')))
  }

  private inlinePayloads() {
    return this._payloads.map<TPayload>((payload, index) => {
      return {
        ...payload,
        schema: this._payload_schemas[index],
      }
    })
  }

  private missingSchemaMessage(payload: Payload) {
    return `Builder: Missing Schema\n${JSON.stringify(payload, null, 2)}`
  }
}
