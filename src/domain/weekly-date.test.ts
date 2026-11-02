import { describe, expect, it } from 'vitest'
import { weeklyDate } from './weekly'

describe('weekly day selection', () => {
  it('keeps all seven dates in calendar order across a month boundary', () => {
    expect(Array.from({ length: 7 }, (_, day) => weeklyDate('2026-10-29', day))).toEqual(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'])
  })
})
