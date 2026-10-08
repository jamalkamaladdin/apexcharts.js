import { describe, it, expect } from 'vitest'
import { createChartWithOptions } from './utils/utils.js'

// #4966: the tooltip read yLabelFormatters by series index, but that array
// holds one formatter per y axis. With seriesName arrays, or more series than
// axes, a series got the formatter of whichever axis shared its index.
const suffix = (s) => (v) => `${v} ${s}`

function formattedBySeries(chart) {
  const labels = chart.w.globals.tooltip.tooltipLabels
  return chart.w.seriesData.series.map((_, i) =>
    labels.getFormatters(i).yLbFormatter(10),
  )
}

describe('tooltip y value formatter follows the series y axis (#4966)', () => {
  it('uses the axis a seriesName array maps the series to', () => {
    const chart = createChartWithOptions({
      chart: { type: 'line' },
      series: [
        { name: 'A', data: [1, 2, 3] },
        { name: 'B', data: [4, 5, 6] },
        { name: 'C', data: [7, 8, 9] },
      ],
      yaxis: [
        { seriesName: ['A', 'B'], labels: { formatter: suffix('S1') } },
        {
          seriesName: ['C'],
          opposite: true,
          labels: { formatter: suffix('S2') },
        },
      ],
    })
    expect(formattedBySeries(chart)).toEqual(['10 S1', '10 S1', '10 S2'])
    chart.destroy()
  })

  it('uses the mapped axis when there are more series than axes', () => {
    const chart = createChartWithOptions({
      chart: { type: 'line' },
      series: [
        { name: 'A', data: [1, 2, 3] },
        { name: 'B', data: [4, 5, 6] },
        { name: 'C', data: [7, 8, 9] },
      ],
      yaxis: [
        { labels: { formatter: suffix('S1') } },
        { opposite: true, labels: { formatter: suffix('S2') } },
      ],
    })
    // C has no axis of its own, so it joins the last one.
    expect(chart.w.globals.seriesYAxisReverseMap).toEqual([0, 1, 1])
    expect(formattedBySeries(chart)).toEqual(['10 S1', '10 S2', '10 S2'])
    chart.destroy()
  })

  it('reads yaxis[i] for configs with one y axis per series', () => {
    const chart = createChartWithOptions({
      chart: { type: 'line' },
      series: [
        { name: 'A', data: [1, 2, 3] },
        { name: 'B', data: [4, 5, 6] },
      ],
      yaxis: [
        { seriesName: 'A', labels: { formatter: suffix('first') } },
        {
          seriesName: 'A',
          show: false,
          labels: { formatter: suffix('second') },
        },
      ],
    })
    expect(formattedBySeries(chart)).toEqual(['10 first', '10 second'])
    chart.destroy()
  })

  it('lets tooltip.y.formatter override the axis formatter', () => {
    const chart = createChartWithOptions({
      chart: { type: 'line' },
      series: [
        { name: 'A', data: [1, 2, 3] },
        { name: 'B', data: [4, 5, 6] },
      ],
      yaxis: [
        { seriesName: ['A'], labels: { formatter: suffix('S1') } },
        { seriesName: ['B'], labels: { formatter: suffix('S2') } },
      ],
      tooltip: { y: { formatter: suffix('tt') } },
    })
    expect(formattedBySeries(chart)).toEqual(['10 tt', '10 tt'])
    chart.destroy()
  })
})
