import { XyoPayload } from '@xyo-network/payload'
import nconf from 'nconf'

const defaults = {
  API_DOMAIN: 'http://localhost:8080',
  PORT: '8080',
}

/**
 * List of ENV VARs to consider. Prevents
 * unintended serialization of entire ENV to config.
 */
const supportedEnvVars = [
  'ACCOUNT_SEED',
  'API_DOMAIN',
  'API_KEY',
  'ETHERSCAN_API_KEY',
  'INFURA_PROJECT_ID',
  'INFURA_PROJECT_SECRET',
  'JWT_SECRET',
  'LOCATION_API_DOMAIN',
  'MONGO_CONNECTION_STRING',
  'MONGO_DATABASE',
  'MONGO_DOMAIN',
  'MONGO_PASSWORD',
  'MONGO_USERNAME',
  'NEO4J_PASSWORD',
  'NEO4J_URL',
  'NEO4J_USERNAME',
]

export const getConfig = async (): Promise<XyoPayload[]> => {
  // eslint-disable-next-line import/no-named-as-default-member
  const config = nconf.argv().env(supportedEnvVars).defaults(defaults).use('memory')
  const bar = config.get()
  return await Promise.resolve([])
}
