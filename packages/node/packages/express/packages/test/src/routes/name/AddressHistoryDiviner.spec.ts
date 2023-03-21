import { Account } from '@xyo-network/account'
import { uuid } from '@xyo-network/core'
import { AddressHistoryQueryPayload, AddressHistoryQuerySchema, DivinerWrapper, XyoDivinerDivineQuerySchema } from '@xyo-network/modules'
import { PayloadBuilder } from '@xyo-network/payload-builder'

import { getArchivist, getDivinerByName, validateDiscoverResponse } from '../../testUtil'

const divinerName = 'AddressHistoryDiviner'

describe(`/${divinerName}`, () => {
  let sut: DivinerWrapper
  beforeAll(async () => {
    sut = await getDivinerByName(divinerName)
  })
  describe('ModuleDiscoverQuerySchema', () => {
    it('issues query', async () => {
      const response = await sut.discover()
      expect(response).toBeArray()
      validateDiscoverResponse(response, [XyoDivinerDivineQuerySchema])
    })
  })
  describe('XyoDivinerDivineQuerySchema', () => {
    const account = Account.random()
    beforeAll(async () => {
      const archivist = await getArchivist(account)
      for (let i = 0; i < 10; i++) {
        const payload = new PayloadBuilder({ schema: 'network.xyo.debug' }).fields({ nonce: uuid() }).build()
        await archivist.insert([payload])
      }
    })
    it('issues query', async () => {
      const address = account.addressValue.hex
      const query: AddressHistoryQueryPayload = { address, limit: 1, schema: AddressHistoryQuerySchema }
      const response = await sut.divine([query])
      expect(response).toBeArray()
      expect(response.length).toBeGreaterThan(0)
      const result = response.pop()
      expect(result).toBeObject()
    })
  })
})