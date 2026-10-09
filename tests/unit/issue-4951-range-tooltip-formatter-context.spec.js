import { describe, it, expect } from 'vitest'
import { createChartWithOptions } from './utils/utils.js'

/**
 * #4951: the range tooltip (rangeArea, rangeBar, timeline) called
 * tooltip.y.formatter with the value alone, so the second argument was
 * undefined. A formatter that read opts.seriesIndex or opts.w threw or
 * printed nothing. Every other axis tooltip passes
 * { series, seriesIndex, dataPointIndex, w }.
 */

function recorder(calls) {
  return (val, opts) => {
    calls.push({ val, opts })
    return 'v' + val
  }
}

function caption(chart, seriesIndex, dataPointIndex) {
  return chart.w.config.tooltip.custom({
    seriesIndex,
    dataPointIndex,
    w: chart.w,
  })
}

describe('issue 4951: range tooltip passes the formatter context', () => {
  it('rangeArea start and end values get series context', async () => {
    const calls = []
    const chart = createChartWithOptions({
      chart: { type: 'rangeArea', height: 300 },
      series: [
        {
          name: 'A',
          data: [
            { x: 'Jan', y: [1, 4] },
            { x: 'Feb', y: [2, 5] },
          ],
        },
      ],
      tooltip: { y: { formatter: recorder(calls) } },
    })
    await chart.render()
    calls.length = 0

    const html = caption(chart, 0, 1)

    expect(html).toContain('v2')
    expect(html).toContain('v5')
    expect(calls.length).toBeGreaterThan(0)
    for (const { opts } of calls) {
      expect(opts).toBeDefined()
      expect(opts.seriesIndex).toBe(0)
      expect(opts.dataPointIndex).toBe(1)
      expect(opts.w).toBe(chart.w)
    }
    const startCall = calls.find((c) => c.val === 2)
    expect(startCall.opts.series).toBe(chart.w.rangeData.seriesRangeStart)
    chart.destroy()
  })

  it('a line series in a rangeArea combo gets series context', async () => {
    const chart = createChartWithOptions({
      chart: { type: 'rangeArea', height: 300 },
      series: [
        {
          type: 'rangeArea',
          name: 'Range',
          data: [
            { x: 'Jan', y: [1, 4] },
            { x: 'Feb', y: [2, 5] },
          ],
        },
        {
          type: 'line',
          name: 'Line',
          data: [
            { x: 'Jan', y: 3 },
            { x: 'Feb', y: 4 },
          ],
        },
      ],
      tooltip: {
        y: {
          formatter: (val, opts) =>
            opts.w.config.series[opts.seriesIndex].name + '=' + val,
        },
      },
    })
    await chart.render()

    expect(caption(chart, 1, 1)).toContain('Line=4')
    chart.destroy()
  })

  it('rangeBar and timeline values get series context', async () => {
    for (const horizontal of [false, true]) {
      const calls = []
      const chart = createChartWithOptions({
        chart: { type: 'rangeBar', height: 300 },
        plotOptions: { bar: { horizontal } },
        xaxis: { type: horizontal ? 'datetime' : 'category' },
        series: [
          {
            name: 'A',
            data: [
              { x: 'Code', y: [Date.UTC(2026, 9, 1), Date.UTC(2026, 9, 5)] },
              { x: 'Test', y: [Date.UTC(2026, 9, 3), Date.UTC(2026, 9, 9)] },
            ],
          },
        ],
        tooltip: { y: { formatter: recorder(calls) } },
      })
      await chart.render()
      calls.length = 0

      caption(chart, 0, 1)

      expect(calls.length).toBeGreaterThan(0)
      for (const { opts } of calls) {
        expect(opts).toBeDefined()
        expect(opts.seriesIndex).toBe(0)
        expect(opts.dataPointIndex).toBe(1)
        expect(opts.w).toBe(chart.w)
      }
      chart.destroy()
    }
  })
})
