import { DirectNodeModule } from '@xyo-network/node-model'

import { printLine, printTitle } from '../../../../lib'

export const listAttachedModules = async (node: DirectNodeModule) => {
  printTitle('List Attached Modules')

  const addresses = await node.attached()

  addresses.forEach((address) => {
    printLine(`0x${address}`)
  })
}
