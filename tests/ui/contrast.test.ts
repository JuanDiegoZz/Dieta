import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = readFileSync('src/styles/index.css', 'utf8')
function token(name: string) { return css.match(new RegExp(`--${name}: (#[0-9a-f]{6})`))![1] }
function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
}
describe('functional text contrast', () => {
  it.each([['muted', 'bg'], ['muted', 'surface'], ['accent-dark', 'accent-soft']])('%s on %s meets normal text AA', (foreground, background) => {
    const values = [luminance(token(foreground)), luminance(token(background))].sort((a, b) => b - a)
    expect((values[0] + 0.05) / (values[1] + 0.05)).toBeGreaterThanOrEqual(4.5)
  })
  it('white on the functional primary coral meets AA', () => {
    expect(1.05 / (luminance(token('accent-dark')) + 0.05)).toBeGreaterThanOrEqual(4.5)
  })
})
