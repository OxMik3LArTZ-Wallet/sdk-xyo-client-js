import { XyoDomainSchema } from '../Schema'
import { XyoDomainPayloadWrapper } from '../Wrapper'

describe('DomainPayloadWrapper', () => {
  test('Valid-discover', async () => {
    const wrapper = await XyoDomainPayloadWrapper.discover(XyoDomainSchema)
    expect(wrapper?.schema()).toBe(XyoDomainSchema)
    await wrapper?.fetch()
    expect(wrapper?.aliases?.length).toBe(3)
    expect(wrapper?.aliases?.[0].huri).toBeDefined()
  })
  test('Valid-discover-proxy', async () => {
    const wrapper = await XyoDomainPayloadWrapper.discover(XyoDomainSchema, `${process.env.API_DOMAIN}/domain`)
    expect(wrapper?.schema()).toBe(XyoDomainSchema)
    await wrapper?.fetch()
    expect(wrapper?.aliases?.length).toBe(3)
    expect(wrapper?.aliases?.[0].huri).toBeDefined()
  })
  test('Invalid-discover-proxy', async () => {
    const wrapper = await XyoDomainPayloadWrapper.discoverRootFileWithProxy('xyoo.network', `${process.env.API_DOMAIN}/domain`)
    expect(wrapper?.schema()).toBeUndefined()
  })
  test('Valid-discover-direct', async () => {
    const wrapper = await XyoDomainPayloadWrapper.discoverRootFileDirect('xyo.network')
    expect(wrapper?.schema()).toBe(XyoDomainSchema)
    await wrapper?.fetch()
    expect(wrapper?.aliases?.length).toBe(3)
    expect(wrapper?.aliases?.[0].huri).toBeDefined()
  })
  test('Valid-domain-no-file', async () => {
    const wrapper = await XyoDomainPayloadWrapper.discoverRootFileDirect('com.cnn')
    expect(wrapper).toBe(undefined)
  })
  test('InValid', async () => {
    const wrapper = await XyoDomainPayloadWrapper.discover('blahblah.blahblah.blahblah')
    expect(wrapper).toBe(undefined)
  })
})
