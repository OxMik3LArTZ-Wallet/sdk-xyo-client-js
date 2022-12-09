import { MemoryNode } from '@xyo-network/node'

import { printLine } from '../lib'
import { getCommand } from './getCommand'
import { printLogo } from './printLogo'
import { stopTerminal } from './stopTerminal'

export const startTerminal = async (node: MemoryNode) => {
  await printLogo()
  printLine('XYO Node Running', 'green')
  let running = true
  while (running) {
    running = await getCommand(node)
  }
  stopTerminal()
}
