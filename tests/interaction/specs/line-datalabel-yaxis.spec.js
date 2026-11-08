import { test, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const bundle = process.env.APEX_BUNDLE || resolve(root, 'dist/apexcharts.js')

const series = [
  { name: 'x', data: [859, 813, 795] },
  { name: 'y', data: [5749, 5100, 4453] },
  { name: 'z', data: [7059, 6739, 6629] },
  { name: 'a', data: [15166, 14481, 13523] },
]

const boxes = (page) =>
  page.evaluate(() => {
    const bounds = (el) => {
      const r = el.getBoundingClientRect()
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
    }
    const axes = [...document.querySelectorAll('.apexcharts-yaxis-label')]
      .filter((el) => el.getBoundingClientRect().width > 0)
      .map(bounds)
    const labels = [...document.querySelectorAll('.apexcharts-datalabel')]
      .filter((el) => el.textContent.trim())
      .map((el) => ({
        text: el.textContent.trim(),
        anchor: el.getAttribute('text-anchor'),
        x: Number(el.getAttribute('x')),
        box: bounds(el),
        background:
          el.previousElementSibling?.tagName.toLowerCase() === 'rect'
            ? bounds(el.previousElementSibling)
            : null,
      }))
    return { axes, labels }
  })

const collisions = ({ axes, labels }) =>
  labels.flatMap(({ text, box, background }) =>
    axes
      .filter((axis) =>
        [box, background]
          .filter(Boolean)
          .some(
            (r) =>
              r.left < axis.right &&
              axis.left < r.right &&
              r.top < axis.bottom &&
              axis.top < r.bottom,
          ),
      )
      .map(() => text),
  )

async function mount(page, width, yaxis, dataLabels = {}) {
  await page.route('http://chart.test/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<div id="chart"></div>' }),
  )
  await page.goto('http://chart.test/')
  await page.addScriptTag({ path: bundle })
  await page.evaluate(
    async ({ width, yaxis, series, dataLabels }) => {
      const Apex = window.ApexCharts || window.ApexModule.default
      window.chart = new Apex(document.querySelector('#chart'), {
        chart: {
          type: 'line',
          width,
          height: 392,
          animations: { enabled: false },
        },
        series,
        xaxis: { categories: ['v21', 'v22', 'v23'] },
        yaxis,
        dataLabels: { enabled: true, ...dataLabels },
      })
      await window.chart.render()
    },
    { width, yaxis, series, dataLabels },
  )
}

for (const width of [400, 662, 800]) {
  test(`line data labels clear left y-axis values at ${width}px`, async ({
    page,
  }) => {
    await mount(page, width)
    const before = await boxes(page)
    expect(before.labels).toHaveLength(12)
    expect(before.axes.length).toBeGreaterThan(0)
    expect(collisions(before)).toEqual([])
    const middle = before.labels.find((label) => label.text === '14481')
    expect(middle.anchor).toBe('middle')
    expect(middle.x).toBeCloseTo(
      before.labels.find((label) => label.text === '13523').x / 2,
      0,
    )

    await page.evaluate(() =>
      window.chart.updateSeries([
        { name: 'x', data: [859, 813, 795] },
        { name: 'y', data: [5748, 5100, 4453] },
        { name: 'z', data: [7059, 6739, 6629] },
        { name: 'a', data: [15167, 14481, 13523] },
      ]),
    )
    const after = await boxes(page)
    expect(after.labels.some((label) => label.text === '15167')).toBe(true)
    expect(collisions(after)).toEqual([])
  })
}

test('right y-axis labels remain visible beside the final line point', async ({
  page,
}) => {
  await mount(page, 400, { opposite: true })
  const result = await boxes(page)
  expect(result.labels).toHaveLength(12)
  expect(result.axes.length).toBeGreaterThan(0)
  expect(collisions(result)).toEqual([])
})

test('both y-axes remain visible when line labels have no background', async ({
  page,
}) => {
  await mount(page, 400, [{}, { opposite: true }], {
    background: { enabled: false },
  })
  const result = await boxes(page)
  expect(result.labels).toHaveLength(12)
  expect(result.labels.every((label) => label.background === null)).toBe(true)
  expect(result.axes.length).toBeGreaterThan(0)
  expect(collisions(result)).toEqual([])
})

test('a clear label retains its explicit x offset', async ({ page }) => {
  await mount(page, 662, undefined, { offsetX: 50 })
  const result = await boxes(page)
  expect(result.labels).toHaveLength(12)
  expect(result.labels.find((label) => label.text === '15166').x).toBe(100)
})
