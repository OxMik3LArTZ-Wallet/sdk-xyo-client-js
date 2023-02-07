import { EmptyObject } from '@xyo-network/core'
import { CommandBuilder, CommandModule } from 'yargs'

import { printError, printLine } from '../../../../lib'
import { BaseArguments } from '../../../BaseArguments'
import { getNode } from '../../../util'
import { getModuleQueries } from '../../util'

export const aliases: ReadonlyArray<string> = []
export const builder: CommandBuilder = {}
export const command = 'queries'
export const deprecated = false
export const describe = 'Display the supported queries for the XYO Node'
export const handler = async (argv: BaseArguments) => {
  const { verbose } = argv
  try {
    const node = await getNode(argv)
    const result = await getModuleQueries(node)
    printLine(JSON.stringify(result))
  } catch (error) {
    if (verbose) printError(JSON.stringify(error))
    throw new Error('Error querying for archivists')
  }
}

const mod: CommandModule<EmptyObject, BaseArguments> = {
  aliases,
  command,
  deprecated,
  describe,
  handler,
}

// eslint-disable-next-line import/no-default-export
export default mod
