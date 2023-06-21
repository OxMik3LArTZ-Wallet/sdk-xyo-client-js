import { delay } from '@xylabs/delay'
import { Account } from '@xyo-network/account'
import shajs from 'sha.js'

import { Words } from '../../Words'

export class WalletBase {
  protected _name: string
  protected _phrase: string

  constructor(phrase: string, name = 'xyoWallet') {
    this._name = name
    this._phrase = phrase
  }

  static async generate() {
    //delay is here to prep for archivist load
    await delay(0)
    const wordList: string[] = []
    while (wordList.length < 16) {
      const index = Math.floor(Math.random() * Words.words.length)
      wordList.push(Words.words[index])
    }
    return new WalletBase(wordList.join(' '))
  }

  getAccount(index: number, salt?: string) {
    const hash = shajs('sha256')
      .update(`${index}${this._phrase}${salt ?? ''}`)
      .digest()
      .toString('hex')
    return Account.create({ privateKey: hash })
  }
}
