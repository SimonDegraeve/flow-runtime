// @flow

declare var describe: (title: string, f: () => void) => void;
declare var it: (title: string, f: () => void) => void;

import * as t from '../src/index'
import { assertValidationFailure, assertValidationSuccess } from './helpers'

describe('$exact', () => {

  it('should succeed validating a valid value', () => {
    const T = t.$exact({ a: t.string })
    assertValidationSuccess(t.validate({ a: 's' }, T))
  })

  it('should fail validating an invalid value', () => {
    const T = t.$exact({ a: t.string })
    assertValidationFailure(t.validate(1, T), [
      'Invalid value 1 supplied to : $Exact<{ a: string }>'
    ])
    assertValidationFailure(t.validate({}, T), [
      'Invalid value undefined supplied to : $Exact<{ a: string }>/a: string'
    ])
    assertValidationFailure(t.validate({ a: 1 }, T), [
      'Invalid value 1 supplied to : $Exact<{ a: string }>/a: string'
    ])
  })

  it('should check for additional props', () => {
    const T = t.$exact({ a: t.string })
    assertValidationFailure(t.validate({ a: 's', additional: 2 }, T), [
      'Invalid value 2 supplied to : $Exact<{ a: string }>/additional: nil'
    ])
  })

})