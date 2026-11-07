import { describe, it, expect } from 'vitest'
import { createChartWithOptions } from './utils/utils.js'

const chart = createChartWithOptions({
  chart: { type: 'bar', height: 325, animations: { enabled: false } },
  series: [
    { name: 'A', data: [90, 0.1, -0.1] },
    { name: 'B', data: [85, 0.2, -0.2] },
  ],
  plotOptions: { bar: { borderRadius: 4, borderRadiusApplication: 'end' } },
  stroke: { colors: ['transparent'], width: 1 },
  dataLabels: { enabled: false },
})
const helpers = chart.ctx.bar.barHelpers

function rect(v1, v2, dir, horizontal = false) {
  return helpers.barRect({
    a: 10,
    len: 20,
    v1,
    v2,
    strokeWidth: 1,
    realIndex: 0,
    j: dir < 0 ? 2 : 1,
    dir,
    horizontal,
  })
}

describe('bars shorter than their stroke', () => {
  it.each([
    ['positive column', 100, 99.8, 1, false],
    ['negative column', 100, 100.2, -1, false],
    ['positive horizontal bar', 100, 100.2, 1, true],
    ['negative horizontal bar', 100, 99.8, -1, true],
  ])('%s does not reverse the value axis', (_, v1, v2, dir, horizontal) => {
    const r = rect(v1, v2, dir, horizontal)
    const extent = horizontal ? (r.x2 - r.x1) * dir : (r.y1 - r.y2) * dir
    expect(extent).toBeGreaterThanOrEqual(0)
    expect(extent).toBeCloseTo(0.1, 9)
    expect(r.strokeCenter).toBeCloseTo(0.05, 9)
    expect(r.pathTo).not.toContain('NaN')
  })

  it('does not change a column taller than its stroke', () => {
    const r = rect(100, 90, 1)
    expect(r.strokeCenter).toBe(0.5)
    expect(r.y1).toBeCloseTo(99.501)
    expect(r.y2).toBeCloseTo(90.501)
  })
})
