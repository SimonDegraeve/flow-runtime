// @flow

import type { Either } from 'flow-static-land/lib/Either'

import * as either from 'flow-static-land/lib/Either'
import { unsafeCoerce } from 'flow-static-land/lib/Unsafe'

export { unsafeCoerce }

//
// type extractor
//

type ExtractType<T, RT: Type<T>> = T; // eslint-disable-line no-unused-vars

export type TypeOf<RT> = ExtractType<*, RT>;

//
// `Type` type class
//

export type ContextEntry = {
  key: string,
  name: string
};

export type Context = Array<ContextEntry>;

export type ValidationError = {
  value: mixed,
  context: Context,
  description: string
};

export type ValidationResult<T> = Either<Array<ValidationError>, T>;

// Note: if a validation succeeded must return `value`
export type Validation<T> = (value: mixed, context: Context) => ValidationResult<T>;

export class Type<T> {
  name: string;
  validate: Validation<T>;
  constructor(name: string, validate: Validation<T>) {
    this.name = name
    this.validate = validate
  }
}

//
// helpers
//

function stringify(value: mixed): string {
  return isFunction(value) ? getFunctionName(value) : JSON.stringify(value)
}

function getContextPath(context: Context): string {
  return context.map(({ key, name }) => `${key}: ${name}`).join('/')
}

function getDefaultDescription(value: mixed, context: Context): string {
  return `Invalid value ${stringify(value)} supplied to ${getContextPath(context)}`
}

function getValidationError(value: mixed, context: Context): ValidationError {
  return {
    value,
    context,
    description: getDefaultDescription(value, context)
  }
}

function getFunctionName(f: Function): string {
  return f.displayName || f.name || `<function${f.length}>`
}

function getObjectKeys<O: Object>(o: O): { [key: $Keys<O>]: boolean } {
  const keys = {}
  for (let k in o) {
    keys[k] = true
  }
  return keys
}

function pushAll<A>(xs: Array<A>, ys: Array<A>): void {
  Array.prototype.push.apply(xs, ys)
}

function checkAdditionalProps(props: Props, o: Object, c: Context): Array<ValidationError> {
  const errors = []
  for (let k in o) {
    if (!props.hasOwnProperty(k)) {
      errors.push(getValidationError(o[k], c.concat(getContextEntry(k, nil))))
    }
  }
  return errors
}

//
// API
//

export function getContextEntry<T>(key: string, type: Type<T>): ContextEntry {
  return {
    key,
    name: type.name
  }
}

export function getDefaultContext<T>(type: Type<T>): Context {
  return [{ key: '', name: type.name }]
}

export function getTypeName<T>(type: Type<T>): string {
  return type.name
}

export function failures<T>(errors: Array<ValidationError>): ValidationResult<T> {
  return either.left(errors)
}

export function failure<T>(value: mixed, context: Context): ValidationResult<T> {
  return either.left([getValidationError(value, context)])
}

export function success<T>(value: T): ValidationResult<T> {
  return either.right(value)
}

export function isFailure<T>(validation: ValidationResult<T>): boolean {
  return either.isLeft(validation)
}

export function isSuccess<T>(validation: ValidationResult<T>): boolean {
  return either.isRight(validation)
}

export function fromFailure<T>(validation: ValidationResult<T>): Array<ValidationError> {
  return either.fromLeft(validation)
}

export function fromSuccess<T>(validation: ValidationResult<T>): T {
  if (isFailure(validation)) {
    crash(fromFailure(validation).map(e => e.description).join('\n'))
  }
  return either.fromRight(validation)
}

export function of<A>(a: A): ValidationResult<A> {
  return either.of(a)
}

export function map<A, B>(validation: ValidationResult<A>, f: (a: A) => B): ValidationResult<B> {
  return either.map(f, validation)
}

export function ap<A, B>(validation: ValidationResult<A>, f: ValidationResult<(a: A) => B>): ValidationResult<B> {
  return either.ap(f, validation)
}

export function chain<A, B>(validation: ValidationResult<A>, f: (a: A) => ValidationResult<B>): ValidationResult<B> {
  return either.chain(f, validation)
}

export function validateWithContext<T>(value: mixed, context: Context, type: Type<T>): ValidationResult<T> {
  return type.validate(value, context)
}

export function validate<T>(value: mixed, type: Type<T>): ValidationResult<T> {
  return validateWithContext(value, getDefaultContext(type), type)
}

export function unsafeValidate<T>(value: mixed, type: Type<T>): T {
  return fromSuccess(validate(value, type))
}

export function is<T>(value: mixed, type: Type<T>): boolean {
  return isSuccess(validate(value, type))
}

export function crash(message: string): void {
  throw new TypeError(`[flow-runtime failure]\n${message}`)
}

export function assert(guard: boolean, message?: () => string): void {
  if (guard !== true) {
    crash(message ? message() : 'Assert failed (turn on "Pause on exceptions" in your Source panel)')
  }
}

//
// literals
//

export class LiteralType<T> extends Type<T> {
  value: T;
  constructor(name: string, validate: Validation<T>, value: T) {
    super(name, validate)
    this.value = value
  }
}

export function literal<T: string | number | boolean, O: $Exact<{ value: T }>>(o: O): LiteralType<$PropertyType<O, 'value'>> { // eslint-disable-line no-unused-vars
  const value = o.value
  return new LiteralType(
    JSON.stringify(value),
    (v, c) => v === value ? success(value) : failure(v, c),
    value
  )
}

//
// class instances
//

export class InstanceOfType<T> extends Type<T> {
  ctor: Class<T>;
  constructor(name: string, validate: Validation<T>, ctor: Class<T>) {
    super(name, validate)
    this.ctor = ctor
  }
}

export function instanceOf<T>(ctor: Class<T>, name?: string): InstanceOfType<T> {
  return new InstanceOfType(
    name || getFunctionName(ctor),
    (v, c) => v instanceof ctor ? success(v) : failure(v, c),
    ctor
  )
}

//
// classes
//

export class ClassType<T> extends Type<T> {
  ctor: T;
  constructor(name: string, validate: Validation<T>, ctor: T) {
    super(name, validate)
    this.ctor = ctor
  }
}

export function classOf<T>(ctor: Class<T>, name?: string): ClassType<Class<T>> {
  const type = refinement(fun, f => f === ctor || f.prototype instanceof ctor, name)
  return new ClassType(
    name || `Class<${getFunctionName(ctor)}>`,
    (v, c) => type.validate(v, c),
    ctor
  )
}

//
// irreducibles
//

function isNil(v: mixed) /* : boolean %checks */ {
  return v === void 0 || v === null
}

export const nil: Type<void | null> = new Type(
  'nil',
  (v, c) => isNil(v) ? success(v) : failure(v, c)
)

export const any: Type<any> = new Type(
  'any',
  (v, c) => success(v) // eslint-disable-line no-unused-vars
)

function isString(v: mixed) /* : boolean %checks */ {
  return typeof v === 'string'
}

export const string: Type<string> = new Type(
  'string',
  (v, c) => isString(v) ? success(v) : failure(v, c)
)

function isNumber(v: mixed) /* : boolean %checks */ {
  return typeof v === 'number' && isFinite(v) && !isNaN(v)
}

export const number: Type<number> = new Type(
  'number',
  (v, c) => isNumber(v) ? success(v) : failure(v, c)
)

function isBoolean(v: mixed) /* : boolean %checks */ {
  return typeof v === 'boolean'
}

export const boolean: Type<boolean> = new Type(
  'boolean',
  (v, c) => isBoolean(v) ? success(v) : failure(v, c)
)

export const arr: Type<Array<mixed>> = new Type(
  'Array',
  (v, c) => Array.isArray(v) ? success(v) : failure(v, c)
)

function isObject(v: mixed) /* : boolean %checks */ {
  return !isNil(v) && typeof v === 'object' && !Array.isArray(v)
}

export const obj: Type<Object> = new Type(
  'Object',
  (v, c) => isObject(v) ? success(v) : failure(v, c)
)

function isFunction(v: mixed) /* : boolean %checks */ {
  return typeof v === 'function'
}

export const fun: Type<Function> = new Type(
  'Function',
  (v, c) => isFunction(v) ? success(v) : failure(v, c)
)

//
// arrays
//

export class ArrayType<RT, T> extends Type<T> {
  type: RT;
  constructor(name: string, validate: Validation<T>, type: RT) {
    super(name, validate)
    this.type = type
  }
}

export function array<T, RT: Type<T>>(type: RT, name?: string): ArrayType<RT, Array<T>> {
  return new ArrayType(
    name || `Array<${getTypeName(type)}>`,
    (v, c) => either.chain(a => {
      const errors = []
      for (let i = 0, len = a.length; i < len; i++) {
        const validation = type.validate(a[i], c.concat(getContextEntry(String(i), type)))
        if (isFailure(validation)) {
          pushAll(errors, fromFailure(validation))
        }
      }
      return errors.length ? failures(errors) : success(unsafeCoerce(a))
    }, arr.validate(v, c)),
    type
  )
}

//
// unions
//

export class UnionType<TS, T> extends Type<T> {
  types: TS;
  constructor(name: string, validate: Validation<T>, types: TS) {
    super(name, validate)
    this.types = types
  }
}

declare function union<A, B, C, D, E, TA: Type<A>, TB: Type<B>, TC: Type<C>, TD: Type<D>, TE: Type<E>, TS: [TA, TB, TC, TD, TE]>(types: TS, name?: string) : UnionType<TS, A | B | C | D | E>; // eslint-disable-line no-redeclare
declare function union<A, B, C, D, TA: Type<A>, TB: Type<B>, TC: Type<C>, TD: Type<D>, TS: [TA, TB, TC, TD]>(types: TS, name?: string) : UnionType<TS, A | B | C | D>; // eslint-disable-line no-redeclare
declare function union<A, B, C, TA: Type<A>, TB: Type<B>, TC: Type<C>, TS: [TA, TB, TC]>(types: TS, name?: string) : UnionType<TS, A | B | C>; // eslint-disable-line no-redeclare
declare function union<A, B, TA: Type<A>, TB: Type<B>, TS: [TA, TB]>(types: TS, name?: string) : UnionType<TS, A | B>; // eslint-disable-line no-redeclare

export function union<TS: Array<Type<mixed>>>(types: TS, name?: string): UnionType<TS, *> {  // eslint-disable-line no-redeclare
  return new UnionType(
    name || `(${types.map(getTypeName).join(' | ')})`,
    (v, c) => {
      for (let i = 0, len = types.length; i < len; i++) {
        const validation = types[i].validate(v, c)
        if (isSuccess(validation)) {
          return validation
        }
      }
      return failure(v, c)
    },
    types
  )
}

//
// tuples
//

export class TupleType<TS, T> extends Type<T> {
  types: TS;
  constructor(name: string, validate: Validation<T>, types: TS) {
    super(name, validate)
    this.types = types
  }
}

declare function tuple<A, B, C, D, E, TA: Type<A>, TB: Type<B>, TC: Type<C>, TD: Type<D>, TE: Type<E>, TS: [TA, TB, TC, TD, TE]>(types: TS, name?: string) : TupleType<TS, [A, B, C, D, E]>; // eslint-disable-line no-redeclare
declare function tuple<A, B, C, D, TA: Type<A>, TB: Type<B>, TC: Type<C>, TD: Type<D>, TS: [TA, TB, TC, TD]>(types: TS, name?: string) : TupleType<TS, [A, B, C, D]>; // eslint-disable-line no-redeclare
declare function tuple<A, B, C, TA: Type<A>, TB: Type<B>, TC: Type<C>, TS: [TA, TB, TC]>(types: TS, name?: string) : TupleType<TS, [A, B, C]>; // eslint-disable-line no-redeclare
declare function tuple<A, B, TA: Type<A>, TB: Type<B>, TS: [TA, TB]>(types: TS, name?: string) : TupleType<TS, [A, B]>; // eslint-disable-line no-redeclare

export function tuple<TS: Array<Type<mixed>>>(types: TS, name?: string): TupleType<TS, *> {  // eslint-disable-line no-redeclare
  return new TupleType(
    name || `[${types.map(getTypeName).join(', ')}]`,
    (v, c) => either.chain(a => {
      const errors = []
      for (let i = 0, len = types.length; i < len; i++) {
        const type = types[i]
        const validation = type.validate(a[i], c.concat(getContextEntry(String(i), type)))
        if (isFailure(validation)) {
          pushAll(errors, fromFailure(validation))
        }
      }
      return errors.length ? failures(errors) : success(a)
    }, arr.validate(v, c)),
    types
  )
}

//
// intersections
//

export class IntersectionType<TS, T> extends Type<T> {
  types: TS;
  constructor(name: string, validate: Validation<T>, types: TS) {
    super(name, validate)
    this.types = types
  }
}

declare function intersection<A, B, C, D, E, TA: Type<A>, TB: Type<B>, TC: Type<C>, TD: Type<D>, TE: Type<E>, TS: [TA, TB, TC, TD, TE]>(types: TS, name?: string) : IntersectionType<TS, A & B & C & D & E>; // eslint-disable-line no-redeclare
declare function intersection<A, B, C, D, TA: Type<A>, TB: Type<B>, TC: Type<C>, TD: Type<D>, TS: [TA, TB, TC, TD]>(types: TS, name?: string) : IntersectionType<TS, A & B & C & D>; // eslint-disable-line no-redeclare
declare function intersection<A, B, C, TA: Type<A>, TB: Type<B>, TC: Type<C>, TS: [TA, TB, TC]>(types: TS, name?: string) : IntersectionType<TS, A & B & C>; // eslint-disable-line no-redeclare
declare function intersection<A, B, TA: Type<A>, TB: Type<B>, TS: [TA, TB]>(types: TS, name?: string) : IntersectionType<TS, A & B>; // eslint-disable-line no-redeclare

export function intersection<TS: Array<Type<mixed>>>(types: TS, name?: string): IntersectionType<TS, *> {  // eslint-disable-line no-redeclare
  return new IntersectionType(
    name || `(${types.map(getTypeName).join(' & ')})`,
    (v, c) => {
      const errors = []
      for (let i = 0, len = types.length; i < len; i++) {
        const type = types[i]
        const validation = type.validate(v, c.concat(getContextEntry(String(i), type)))
        if (isFailure(validation)) {
          pushAll(errors, fromFailure(validation))
        }
      }
      return errors.length ? failures(errors) : success(v)
    },
    types
  )
}

//
// maybes
//

export class MaybeType<RT, T> extends Type<?T> {
  type: RT;
  constructor(name: string, validate: Validation<T>, type: RT) {
    super(name, validate)
    this.type = type
  }
}

export function maybe<T, RT: Type<T>>(type: RT, name?: string): MaybeType<RT, T> {
  return new MaybeType(
    name || `?${getTypeName(type)}`,
    (v, c) => unsafeCoerce(isNil(v) ? success(v) : type.validate(v, c)),
    type
  )
}

//
// map objects
//

export class MappingType<RTD, RTC, T> extends Type<T> {
  kind: 'mapping';
  domain: RTD;
  codomain: RTC;
  constructor(name: string, validate: Validation<T>, domain: RTD, codomain: RTC) {
    super(name, validate)
    this.domain = domain
    this.codomain = codomain
  }
}

export function mapping<D, RTD: Type<D>, C, RTC: Type<C>>(domain: RTD, codomain: RTC, name?: string): MappingType<RTD, RTC, { [key: TypeOf<RTD>]: TypeOf<RTC> }> { // eslint-disable-line no-unused-vars
  return new MappingType(
    name || `{ [key: ${getTypeName(domain)}]: ${getTypeName(codomain)} }`,
    (v, c) => either.chain(o => {
      const errors = []
      for (let k in o) {
        const domainValidation = domain.validate(k, c.concat(getContextEntry(k, domain)))
        if (isFailure(domainValidation)) {
          pushAll(errors, fromFailure(domainValidation))
        }
        const codomainValidation = codomain.validate(o[k], c.concat(getContextEntry(k, codomain)))
        if (isFailure(codomainValidation)) {
          pushAll(errors, fromFailure(codomainValidation))
        }
      }
      return errors.length ? failures(errors) : success(o)
    }, obj.validate(v, c)),
    domain,
    codomain
  )
}

//
// refinements
//

export type Predicate<T> = (value: T) => boolean;

export class RefinementType<RT, T> extends Type<T> {
  type: RT;
  predicate: Predicate<T>;
  constructor(name: string, validate: Validation<T>, type: RT, predicate: Predicate<T>) {
    super(name, validate)
    this.type = type
    this.predicate = predicate
  }
}

export function refinement<T, RT: Type<T>>(type: RT, predicate: Predicate<T>, name?: string): RefinementType<RT, T> {
  return new RefinementType(
    name || `(${getTypeName(type)} | ${getFunctionName(predicate)})`,
    (v, c) => either.chain(
      t => predicate(t) ? success(t) : failure(v, c),
      type.validate(v, c)
    ),
    type,
    predicate
  )
}

//
// recursive types
//

export function recursion<T, RT: Type<T>>(name: string, definition: (self: Type<T>) => RT): RT {
  const Self = new Type(name, (v, c) => Result.validate(v, c))
  const Result = definition(Self)
  Result.name = name
  return Result
}

//
// $Keys
//

export class $KeysType<RT, T> extends Type<T> {
  type: RT;
  constructor(name: string, validate: Validation<T>, type: RT) {
    super(name, validate)
    this.type = type
  }
}

export function $keys<T, RT: Type<T>>(type: RT, name?: string): $KeysType<RT, $Keys<T>> {
  const keys = typeof type.props !== 'undefined' && isObject(type.props) ? getObjectKeys(type.props) : null
  return new $KeysType(
    name || `$Keys<${type.name}>`,
    (v, c) => either.chain(
      k => {
        if (keys) {
          return keys.hasOwnProperty(v) ? success(unsafeCoerce(k)) : failure(v, c)
        }
        return success(unsafeCoerce(k))
      },
      string.validate(v, c)
    ),
    type
  )
}

//
// $Exact
//

export class $ExactType<P: Props, T> extends Type<T> {
  props: P;
  constructor(name: string, validate: Validation<T>, props: P) {
    super(name, validate)
    this.props = props
  }
}

export type PropsType<P: Props> = $ObjMap<P, <T>(v: Type<T>) => T>;

// accepts props instead of a generic type because of https://github.com/facebook/flow/issues/2626
export function $exact<P: Props>(props: P, name?: string): $ExactType<P, $Exact<PropsType<P>>> {
  name = name || `$Exact<${getDefaultObjectTypeName(props)}>`
  const type = object(props, name)
  return new $ExactType(
    name,
    (v, c) => either.chain(o => {
      const errors = checkAdditionalProps(props, o, c)
      return errors.length ? failures(errors) : success(unsafeCoerce(o))
    }, type.validate(v, c)),
    props
  )
}

//
// $Shape
//

export class $ShapeType<RT, T> extends Type<T> {
  type: RT;
  constructor(name: string, validate: Validation<T>, type: RT) {
    super(name, validate)
    this.type = type
  }
}

export function $shape<P: Props, RT: ObjectType<P, *>>(type: RT, name?: string): $ShapeType<RT, $Shape<PropsType<P>>> {
  const props = type.props
  return new $ShapeType(
    name || `$Shape<${type.name}>`,
    (v, c) => either.chain(o => {
      const errors = []
      for (let prop in props) {
        if (o.hasOwnProperty(prop)) {
          const type = props[prop]
          const validation = type.validate(o[prop], c.concat(getContextEntry(prop, type)))
          if (isFailure(validation)) {
            pushAll(errors, fromFailure(validation))
          }
        }
      }
      pushAll(errors, checkAdditionalProps(props, o, c))
      return errors.length ? failures(errors) : success(o)
    }, obj.validate(v, c)),
    type
  )
}

//
// objects
//

export type Props = {[key: string]: Type<*>};

export class ObjectType<P: Props, T> extends Type<T> {
  props: P;
  constructor(name: string, validate: Validation<T>, props: P) {
    super(name, validate)
    this.props = props
  }
}

function getDefaultObjectTypeName(props: Props): string {
  return `{ ${Object.keys(props).map(k => `${k}: ${props[k].name}`).join(', ')} }`
}

export function object<P: Props>(props: P, name?: string): ObjectType<P, PropsType<P>> {
  return new ObjectType(
    name || getDefaultObjectTypeName(props),
    (v, c) => either.chain(o => {
      const errors = []
      for (let k in props) {
        const type = props[k]
        const validation = type.validate(o[k], c.concat(getContextEntry(k, type)))
        if (isFailure(validation)) {
          pushAll(errors, fromFailure(validation))
        }
      }
      return errors.length ? failures(errors) : success(o)
    }, obj.validate(v, c)),
    props
  )
}
