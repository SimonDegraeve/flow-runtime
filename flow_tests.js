// @flow

import type {
  TypeOf,
  ContextEntry,
  Context,
  ValidationError,
  ValidationResult,
  Validation,
  Type,
  LiteralType,
  InstanceOfType,
  ClassType,
  ArrayType,
  UnionType,
  TupleType,
  IntersectionType,
  MaybeType,
  MappingType,
  RefinementType,
  $KeysType,
  $ExactType,
  $ShapeType,
  ObjectType,
  Predicate,
  Props
} from './src/index'

import * as t from './src/index'

//
// irreducibles
//

const T1 = t.number
t.map(t.validate(1, T1), v1 => {
  (v1: number)
  ;(v1: TypeOf<typeof T1>)
  // $ExpectError
  ;(v1: string)
})
// $ExpectError
;('a': TypeOf<typeof T1>)

// runtime type introspection
const RTI1 = t.number
;(RTI1.name: string)

//
// instanceOf
//

class A {}
const T2 = t.instanceOf(A)
t.map(t.validate(new A(), T2), v2 => {
  (v2: A)
  ;(v2: TypeOf<typeof T2>)
  // $ExpectError
  ;(v2: string)
})
// $ExpectError
;(1: TypeOf<typeof T2>)

// runtime type introspection
const RTI2 = t.instanceOf(A)
;(RTI2.name: string)
;(RTI2.ctor: Class<A>)

//
// literals
//

const T3 = t.literal({ value: 'a' })
t.map(t.validate('a', T3), v3 => {
  (v3: 'a')
  ;(v3: TypeOf<typeof T3>)
  // $ExpectError
  ;(v3: 'b')
})
// $ExpectError
;(1: TypeOf<typeof T3>)

// runtime type introspection
const RTI3 = t.literal({ value: 'a' })
;(RTI3.name: string)
;(RTI3.value: string)

//
// arrays
//

const T4 = t.array(t.number)
t.map(t.validate([1, 2, 3], T4), v4 => {
  (v4: Array<number>)
  ;(v4: TypeOf<typeof T4>)
  // $ExpectError
  ;(v4: Array<string>)
})
// $ExpectError
;(1: TypeOf<typeof T4>)
// $ExpectError
;(['a']: TypeOf<typeof T4>)

// runtime type introspection
const RTI4 = t.array(t.object({ a: t.number }))
;(RTI4.name: string)
;(RTI4.type: Type<{ a: number }>)
;(RTI4.type.props: Props)
;(RTI4.type.props.a: Type<number>)

//
// unions
//

const T5 = t.union([t.string, t.number])
t.map(t.validate(1, T5), v5 => {
  (v5: string | number)
  ;(v5: TypeOf<typeof T5>)
  // $ExpectError
  ;(v5: string)
})
// $ExpectError
;(true: TypeOf<typeof T5>)

// runtime type introspection
const RTI5 = t.union([t.string, t.object({ a: t.number })])
;(RTI5.name: string)
;(RTI5.types[0]: Type<string>)
;(RTI5.types[1]: ObjectType<Props, { a: number }>)
;(RTI5.types[1].props: Props)
;(RTI5.types[1].props.a: Type<number>)

//
// tuples
//

const T6 = t.tuple([t.string, t.number])
t.map(t.validate(['a', 1], T6), v6 => {
  (v6: [string, number])
  ;(v6: TypeOf<typeof T6>)
  // $ExpectError
  ;(v6: [number, number])
})
// $ExpectError
;([1, 2]: TypeOf<typeof T6>)

// runtime type introspection
const RTI6 = t.tuple([t.string, t.object({ a: t.number })])
;(RTI6.name: string)
;(RTI6.types[0]: Type<string>)
;(RTI6.types[1]: ObjectType<Props, { a: number }>)
;(RTI6.types[1].props: Props)
;(RTI6.types[1].props.a: Type<number>)

//
// intersections
//

// $ExpectError
t.intersection()

// $ExpectError
t.intersection([])

const T7 = t.intersection([t.object({ a: t.number }), t.object({ b: t.number })])
t.map(t.validate({ a: 1, b: 2 }, T7), v7 => {
  (v7: { a: number } & { b: number })
  ;(v7: TypeOf<typeof T7>)
  ;(v7: { a: number })
  ;(v7: { b: number })
  // $ExpectError
  ;(v7: { a: string })
})
// $ExpectError
;(1: TypeOf<typeof T7>)

// runtime type introspection
const RTI7 = t.intersection([t.object({ a: t.number }), t.object({ b: t.number })])
;(RTI7.name: string)
;(RTI7.types[0]: Type<{ a: number }>)
;(RTI7.types[1]: ObjectType<Props, { b: number }>)
;(RTI7.types[1].props: Props)
;(RTI7.types[1].props.b: Type<number>)

//
// maybes
//

const T8 = t.maybe(t.number)
t.map(t.validate(null, T8), v8 => {
  (v8: ?number)
  ;(v8: TypeOf<typeof T8>)
  // $ExpectError
  ;(v8: ?string)
})
;(null: TypeOf<typeof T8>)
;(undefined: TypeOf<typeof T8>)
// $ExpectError
;('a': TypeOf<typeof T8>)

// runtime type introspection
const RTI8 = t.maybe(t.object({ a: t.number }))
;(RTI8.name: string)
;(RTI8.type: ObjectType<Props, { a: number }>)
;(RTI8.type.props: Props)
;(RTI8.type.props.a: Type<number>)

//
// map objects
//

const T9 = t.mapping(t.union([t.literal({ value: 'a' }), t.literal({ value: 'b' })]), t.number)
t.map(t.validate(null, T9), v9 => {
  (v9: { [key: 'a' | 'b']: number })
  ;(v9: TypeOf<typeof T9>)
  // $ExpectError
  ;(v9: { [key: string]: number })
})
;({}: TypeOf<typeof T9>)
// $ExpectError
;(1: TypeOf<typeof T9>)

// runtime type introspection
const RTI9 = t.mapping(t.union([t.literal({ value: 'a' }), t.literal({ value: 'b' })]), t.object({ a: t.number }))
;(RTI9.name: string)
;(RTI9.domain: Type<'a'| 'b'>)
;(RTI9.codomain: ObjectType<Props, { a: number }>)
;(RTI9.codomain.props: Props)
;(RTI9.codomain.props.a: Type<number>)

//
// refinements
//

const T10 = t.refinement(t.number, n => n >= 0)
t.map(t.validate(1, T10), v10 => {
  (v10: number)
  ;(v10: TypeOf<typeof T10>)
  // $ExpectError
  ;(v10: string)
})
// $ExpectError
;('a': TypeOf<typeof T10>)

// runtime type introspection
const RTI10 = t.refinement(t.object({ a: t.number }), () => true)
;(RTI10.name: string)
;(RTI10.type: ObjectType<Props, { a: number }>)
;(RTI10.type.props: Props)
;(RTI10.type.props.a: Type<number>)
;(RTI10.predicate: Predicate<{ a: number }>)

//
// recursive types
//

type T11T = {
  a: number,
  b: ?T11T
};
const T11 = t.recursion('T11', self => t.object({
  a: t.number,
  b: t.maybe(self)
}))
t.map(t.validate({ a: 1 }, T11), v11 => {
  (v11: T11T)
  ;(v11: TypeOf<typeof T11>)
  // $ExpectError
  ;(v11: string)
})
// $ExpectError
;(1: TypeOf<typeof T11>)

// runtime type introspection
const RTI11 = t.recursion('T11', self => t.object({
  a: t.number,
  b: t.maybe(self)
}))
;(RTI11.name: string)
;(RTI11.props: Props)
;(RTI11.props.a: Type<number>)
;(RTI11.props.b: Type<?T11T>)

//
// $Keys
//

const T12 = t.$keys(t.object({ a: t.number, b: t.number }))
t.map(t.validate('a', T12), v12 => {
  (v12: 'a' | 'b')
  ;(v12: TypeOf<typeof T12>)
  ;(v12: string)
  // $ExpectError
  ;(v12: number)
})
// $ExpectError
;(1: TypeOf<typeof T12>)

// runtime type introspection
const RTI12 = t.$keys(t.object({ a: t.number, b: t.number }))
;(RTI12.name: string)
;(RTI12.type: ObjectType<Props, { a: number, b: number }>)
;(RTI12.type.props: Props)
;(RTI12.type.props.a: Type<number>)

//
// $Exact
//

const T13 = t.$exact({ a: t.number })
t.map(t.validate(1, T13), v13 => {
  (v13: {| a: number |})
  ;(v13: TypeOf<typeof T13>)
  // $ExpectError
  ;(v13: number)
})
// $ExpectError
;(1: TypeOf<typeof T13>)

// runtime type introspection
const RTI13 = t.$exact({ a: t.number })
;(RTI13.name: string)
;(RTI13.props: Props)
;(RTI13.props.a: Type<number>)

// keys
const KT13 = t.$keys(T13)
t.map(t.validate('a', KT13), kv13 => {
  (kv13: 'a')
  ;(kv13: TypeOf<typeof KT13>)
  // $ExpectError
  ;(kv13: number)
})

//
// $Shape
//

const T14 = t.$shape(t.object({ a: t.number }))
t.map(t.validate({}, T14), v14 => {
  (v14: $Shape<{ a: number }>)
  ;(v14: TypeOf<typeof T14>)
  // $ExpectError
  ;(v14: { a: number, b: number })
})
// $ExpectError
;(1: TypeOf<typeof T14>)

// runtime type introspection
const RTI14 = t.$shape(t.object({ a: t.number }))
;(RTI14.name: string)
;(RTI14.type: ObjectType<Props, { a: number }>)
;(RTI14.type.props: Props)
;(RTI14.type.props.a: Type<number>)

// keys
const KT14 = t.$keys(T14)
t.map(t.validate('a', KT14), kv14 => {
  (kv14: 'a')
  ;(kv14: TypeOf<typeof KT14>)
  // $ExpectError
  ;(kv14: number)
})

//
// objects
//

type T15T = {
  a: number,
  b: {
    c: string,
    d: {
      e: number
    }
  }
};
const T15 = t.object({
  a: t.number,
  b: t.object({
    c: t.string,
    d: t.object({
      e: t.number
    })
  })
})
t.map(t.validate({}, T15), v15 => {
  (v15: T15T)
  ;(v15: TypeOf<typeof T15>)
  // $ExpectError
  ;(v15.b.d.e: string)
})
// $ExpectError
;(1: TypeOf<typeof T15>)
// $ExpectError
;({}: TypeOf<typeof T15>)
// $ExpectError
;({
  // a: 'a', // <= Flow bug???
  // b: 'b'
}: TypeOf<typeof T15>)

const RTI15 = t.object({
  a: t.number,
  b: t.object({
    c: t.string,
    d: t.object({
      e: t.number
    })
  })
})
;(RTI15.name: string)
;(RTI15.props: Props)
;(RTI15.props.a: Type<number>)
;(RTI15.props.b.props.c: Type<string>)
;(RTI15.props.b.props.d: ObjectType<Props, { e: number }>)
;(RTI15.props.b.props.d.props.e: Type<number>)

// keys
const KT15 = t.$keys(T15)
t.map(t.validate('a', KT15), kv15 => {
  (kv15: 'a' | 'b')
  ;(kv15: TypeOf<typeof KT15>)
  // $ExpectError
  ;(kv15: number)
})

//
// classOf
//

const T16 = t.classOf(A)
t.map(t.validate(A, T16), v16 => {
  (v16: Class<A>)
  ;(v16: TypeOf<typeof T16>)
  // $ExpectError
  ;(v16: string)
})
// $ExpectError
;(1: TypeOf<typeof T16>)

// runtime type introspection
const RTI16 = t.classOf(A)
;(RTI16.name: string)
;(RTI16.ctor: Class<A>)

