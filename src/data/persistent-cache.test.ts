import { describe, expect, it } from 'vitest'
import type { PersistentCacheRecord } from './persistent-cache'

describe('persistent cache records', () => {
  it('keeps payload, validator and timestamp together', () => {
    const record: PersistentCacheRecord<{ version: string }> = {
      key: 'bootstrap',
      payload: { version: 'catalog-1' },
      etag: '"catalog-1"',
      savedAt: 100,
    }

    expect(record).toMatchObject({ key: 'bootstrap', etag: '"catalog-1"', payload: { version: 'catalog-1' } })
  })
})
