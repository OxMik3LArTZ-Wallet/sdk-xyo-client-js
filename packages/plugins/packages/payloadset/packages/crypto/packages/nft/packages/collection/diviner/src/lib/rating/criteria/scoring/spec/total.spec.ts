import { NftCollectionInfo } from '@xyo-network/crypto-nft-collection-payload-plugin'
import { Score } from '@xyo-network/crypto-nft-score-model'

import { scoreTotal } from '../total'

type ScoreEvaluationFunction = (score: Score) => void

const expectScoreWithinRange = (lower: number, upper: number): ScoreEvaluationFunction => {
  return (score: Score) => {
    expect(score[0]).toBeGreaterThanOrEqual(lower)
    expect(score[0]).toBeLessThanOrEqual(upper)
  }
}

describe('scoreTotal', () => {
  const values: [total: number, expectation: ScoreEvaluationFunction][] = [
    [1, (score) => expectScoreWithinRange(0, 10)(score)],
    [2, (score) => expectScoreWithinRange(0, 10)(score)],
    [3, (score) => expectScoreWithinRange(0, 10)(score)],
    [10, (score) => expectScoreWithinRange(0, 10)(score)],
    [20, (score) => expectScoreWithinRange(0, 10)(score)],
    [30, (score) => expectScoreWithinRange(10, 25)(score)],
    [100, (score) => expectScoreWithinRange(25, 50)(score)],
    [200, (score) => expectScoreWithinRange(50, 75)(score)],
    [300, (score) => expectScoreWithinRange(50, 75)(score)],
    [1000, (score) => expectScoreWithinRange(75, 100)(score)],
    [2000, (score) => expectScoreWithinRange(75, 100)(score)],
    [3000, (score) => expectScoreWithinRange(75, 100)(score)],
    [10000, (score) => expectScoreWithinRange(50, 75)(score)],
    [20000, (score) => expectScoreWithinRange(25, 50)(score)],
    [30000, (score) => expectScoreWithinRange(25, 50)(score)],
    [100000, (score) => expectScoreWithinRange(10, 25)(score)],
    [200000, (score) => expectScoreWithinRange(0, 10)(score)],
    [300000, (score) => expectScoreWithinRange(0, 10)(score)],
  ]

  it.each(values)('scores the total', (total, expectations) => {
    const collection: NftCollectionInfo = {
      address: '0x0000000000',
      chainId: 1,
      name: 'test',
      symbol: 'TEST',
      tokenType: 'ERC721',
      total,
    }
    const [score, possible] = scoreTotal(collection)
    expect(score).toBeNumber()
    expect(score).not.toBeNegative()
    expect(possible).toBeNumber()
    expect(possible).not.toBeNegative()
    expectations([score, possible])
  })
})