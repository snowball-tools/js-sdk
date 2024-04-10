import { describe, expect, test } from 'bun:test'

import { SnowballError } from '../src/error'

describe('SnowballError', () => {
  test('basic', () => {
    const e = new SnowballError('name', 'message')
    expect(e.message).toBe('[Snowball] message')
  })

  test('nested.1', () => {
    const e1 = new SnowballError('err.e1', '[E1] Bad1')
    const e2 = SnowballError.make('err.e2', '[E2] Bad2', e1)
    expect(e2.message).toBe('[Snowball][E2] Bad2: [E1] Bad1')
  })

  test('nested.2', () => {
    const e1 = new SnowballError('err.e1', '[E1] Bad1')
    const e2 = SnowballError.make('err.e2', '[E2] Bad2', e1)
    const e3 = SnowballError.make('err.e3', '[E3] Bad3', e2)
    expect(e3.message).toBe('[Snowball][E3] Bad3: [E2] Bad2: [E1] Bad1')
  })
})
