// The website's /tools.json is the single source for Breathe timing and Ground wording. CI can't fetch
// it, so the app vendors a copy; this fails if the two files differ by a single byte.
import { readFileSync } from 'fs'
import { join } from 'path'

const root = join(__dirname, '..', '..')
const SITE = join(root, 'vendor', 'site-tools.json')

it('src/content/tools.json matches the website tools.json byte for byte', () => {
  expect(readFileSync(join(root, 'src', 'content', 'tools.json')).equals(readFileSync(SITE))).toBe(true)
})
