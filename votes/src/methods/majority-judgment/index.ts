import _ from 'lodash-es'

import { BallotMethod } from '../../classes/ballot-method'
import type { Ballot, ScoreObject } from '../../types'
import { scoresToRanking } from '../../utils'

export type Judgements = {
  [candidate: string]: [number, number, number, number, number, number]
}

const makeJudgement = (candidates: string[], ballots: Ballot[]): Judgements => {
  const judgements: Judgements = _.zipObject(
    candidates,
    candidates.map(() => [0, 0, 0, 0, 0, 0]),
  )

  for (const ballot of ballots)
    for (const [rankIdx, rank] of ballot.ranking.entries())
      for (const can of rank)
        if (candidates.includes(can))
          judgements[can][rankIdx < 5 ? rankIdx : 5] += ballot.weight

  return judgements
}

export const getMedian = (arr: number[]): number => {
  const sumWeights = _.sum(arr)
  if (sumWeights === 0) return -1

  const midpoint = Math.ceil(sumWeights / 2)
  const isEven = sumWeights % 2 === 0
  let cumulativeSum = 0
  let prevI = 0

  for (const [i, count] of [...arr.entries()].filter(
    ([, count]) => count > 0,
  )) {
    const prevSum = cumulativeSum
    cumulativeSum += count

    if (isEven) {
      // Even - find middle 2 elements
      const leftMid = midpoint
      const rightMid = midpoint + 1
      if (cumulativeSum >= rightMid) {
        return prevSum < leftMid ? i : (prevI + i) / 2
      }
    } else {
      // Odd - find exact middle point
      if (cumulativeSum >= midpoint) {
        return i
      }
    }

    prevI = i
  }

  // If we get here, all weights are at the end, return the last index
  return arr.length - 1
}

const getMedians = (judgements: Judgements) => {
  const candidates = Object.keys(judgements)

  const medians: { [candidate: string]: number } = {}
  for (const c of candidates) medians[c] = getMedian(judgements[c])
  return medians
}

const majorityJudgmentRanking = (
  candidates: string[],
  ballots: Ballot[],
): string[][] => {
  const judgements = makeJudgement(candidates, ballots)
  return tieBreak(judgements).reverse()
}

const tieBreak = (judgements: Judgements): string[][] => {
  const medians = getMedians(judgements)
  const ranking = scoresToRanking(medians)
  return ranking.flatMap((cs) => {
    const median = medians[cs[0]]
    if (median === -1 || !Number.isInteger(median)) return [cs]
    const j = _.pick(judgements, cs)
    const minGroup = Math.min(...cs.map((c) => j[c][median]))
    if (minGroup <= 0) return [cs]
    const j2 = _.mapValues(j, (jc) =>
      Object.assign([], jc, { [median]: jc[median] - minGroup }),
    )
    return tieBreak(j2)
  })
}

export class MajorityJudgment extends BallotMethod {
  public judgements(): Judgements {
    return makeJudgement(this.candidates, this.ballots)
  }

  public medians(): ScoreObject {
    return getMedians(this.judgements())
  }

  public ranking(): string[][] {
    return majorityJudgmentRanking(this.candidates, this.ballots)
  }
}
