@module("bun:test")
external describe: (string, (unit => unit)) => unit = "describe"

@module("bun:test")
@scope(("describe"))
external describeOnly: (string, (unit => unit)) => unit = "only"

@module("bun:test")
@scope(("describe"))
external describeSkip: (string, (unit => unit)) => unit = "skip"

@module("bun:test")
@scope(("describe"))
external describeIf: (bool, string, (unit => unit)) => unit = "if"

@module("bun:test")
@scope(("describe"))
external describeSkipIf: (bool, string, (unit => unit)) => unit = "skipIf"

@module("bun:test")
@scope(("describe"))
external describeTodoIf: (bool, string, (unit => unit)) => unit = "todoIf"

@module("bun:test")
@scope(("describe"))
external describeEach: (array<'a>, string, ('a => unit)) => unit = "each"

@module("bun:test")
external test: (string, (unit => 'a)) => unit = "test"

@module("bun:test")
external testDone: (string, ((unit => unit) => unit)) => unit = "test"

@module("bun:test")
@scope(("test"))
external testOnly: (string, (unit => 'a)) => unit = "only"

@module("bun:test")
@scope(("test"))
external testSkip: (string, (unit => 'a)) => unit = "skip"

@module("bun:test")
@scope(("test"))
external testTodo: (string, (unit => unit)) => unit = "todo"

@module("bun:test")
@scope(("test"))
external testFailing: (string, (unit => 'a)) => unit = "failing"

@module("bun:test")
@scope(("test"))
external testIf: (bool, string, (unit => 'a)) => unit = "if"

@module("bun:test")
@scope(("test"))
external testSkipIf: (bool, string, (unit => 'a)) => unit = "skipIf"

@module("bun:test")
@scope(("test"))
external testTodoIf: (bool, string, (unit => 'a)) => unit = "todoIf"

@module("bun:test")
@scope(("test"))
external testEach: (array<'a>, string, ('a => 'b)) => unit = "each"

@module("bun:test")
external testWithTimeout: (string, (unit => 'a), int) => unit = "test"

type testOptions = {
  retry?: int,
  repeats?: int,
}

@module("bun:test")
external testWithOptions: (string, (unit => 'a), testOptions) => unit = "test"


@module("bun:test")
external beforeAll: (unit => unit) => unit = "beforeAll"

@module("bun:test")
external afterAll: (unit => unit) => unit = "afterAll"

@module("bun:test")
external beforeEach: (unit => unit) => unit = "beforeEach"

@module("bun:test")
external afterEach: (unit => unit) => unit = "afterEach"

type expect<'a>
type expectType<'a>

@module("bun:test")
external expect: 'a => expect<'a> = "expect"

@module("bun:test")
external expectTypeOf: 'a => expectType<'a> = "expectTypeOf"



@get
external not: expect<'a> => expect<'a> = "not"

@module("bun:test")
@scope(("expect"))
external assertions: int => unit = "assertions"

@module("bun:test")
@scope(("expect"))
external hasAssertions: unit => unit = "hasAssertions"

@send
external toEqualTypeOf: (expectType<'a>, 'b) => unit = "toEqualTypeOf"

@send
external toBeNumber: expectType<'a> => unit = "toBeNumber"

@send
external toBeString: expectType<'a> => unit = "toBeString"

@send
external toBeFunction: expectType<'a> => unit = "toBeFunction"

@send
external toMatchObjectType: (expectType<'a>, 'b) => unit = "toMatchObjectType"

@get
external parameters: expectType<'a> => expectType<'a> = "parameters"

@get
external returns: expectType<'a> => expectType<'a> = "returns"

@get
external items: expectType<'a> => expectType<'a> = "items"

@get
external resolvesType: expectType<'a> => expectType<'a> = "resolves"

@send
external toBe: (expect<'a>, 'a) => unit = "toBe"

@send
external toEqual: (expect<'a>, 'b) => unit = "toEqual"

@send
external toStrictEqual: (expect<'a>, 'b) => unit = "toStrictEqual"

@send
external toBeDefined: expect<'a> => unit = "toBeDefined"

@send
external toBeNaN: expect<'a> => unit = "toBeNaN"

@send
external toBeTruthy: expect<'a> => unit = "toBeTruthy"

@send
external toBeFalsy: expect<'a> => unit = "toBeFalsy"

@send
external toBeNull: expect<'a> => unit = "toBeNull"

@send
external toBeUndefined: expect<'a> => unit = "toBeUndefined"

@send
external toBeGreaterThan: (expect<'a>, 'a) => unit = "toBeGreaterThan"

@send
external toBeLessThan: (expect<'a>, 'a) => unit = "toBeLessThan"

@send
external toBeGreaterThanOrEqual: (expect<'a>, 'a) => unit = "toBeGreaterThanOrEqual"

@send
external toBeLessThanOrEqual: (expect<'a>, 'a) => unit = "toBeLessThanOrEqual"

@send
external toBeCloseTo: (expect<'a>, 'a) => unit = "toBeCloseTo"

@send
external toContain: (expect<'a>, 'b) => unit = "toContain"

@send
external toHaveLength: (expect<'a>, int) => unit = "toHaveLength"

@send
external toMatch: (expect<'a>, string) => unit = "toMatch"

@send
external toThrow: expect<'a> => unit = "toThrow"

@send
external toThrowMessage: (expect<'a>, string) => unit = "toThrow"

@send
external toBeInstanceOf: (expect<'a>, 'b) => unit = "toBeInstanceOf"

@send
external toContainEqual: (expect<'a>, 'b) => unit = "toContainEqual"

@send
external toHaveProperty: (expect<'a>, string) => unit = "toHaveProperty"

@send
external toMatchObject: (expect<'a>, 'b) => unit = "toMatchObject"

@send
external toContainAllKeys: (expect<'a>, array<'b>) => unit = "toContainAllKeys"

@send
external toContainValue: (expect<'a>, 'b) => unit = "toContainValue"

@send
external toContainValues: (expect<'a>, array<'b>) => unit = "toContainValues"

@send
external toContainAllValues: (expect<'a>, array<'b>) => unit = "toContainAllValues"

@send
external toContainAnyValues: (expect<'a>, array<'b>) => unit = "toContainAnyValues"

@send
external toThrowErrorMatchingSnapshot: expect<'a> => unit = "toThrowErrorMatchingSnapshot"

@send
external toThrowErrorMatchingInlineSnapshot: (expect<'a>, string) => unit = "toThrowErrorMatchingInlineSnapshot"

@send
external toMatchSnapshot: expect<'a> => unit = "toMatchSnapshot"

@send
external toMatchInlineSnapshot: (expect<'a>, string) => unit = "toMatchInlineSnapshot"

@send
external toHaveBeenCalled: expect<'a> => unit = "toHaveBeenCalled"

@send
external toHaveBeenCalledTimes: (expect<'a>, int) => unit = "toHaveBeenCalledTimes"

@send
external toHaveBeenCalledWith: (expect<'a>, array<'b>) => unit = "toHaveBeenCalledWith"

@send
external toHaveBeenLastCalledWith: (expect<'a>, array<'b>) => unit = "toHaveBeenLastCalledWith"

@send
external toHaveBeenNthCalledWith: (expect<'a>, int, array<'b>) => unit = "toHaveBeenNthCalledWith"

@send
external toHaveReturned: expect<'a> => unit = "toHaveReturned"

@send
external toHaveReturnedTimes: (expect<'a>, int) => unit = "toHaveReturnedTimes"

@send
external toHaveReturnedWith: (expect<'a>, 'b) => unit = "toHaveReturnedWith"

@send
external toHaveLastReturnedWith: (expect<'a>, 'b) => unit = "toHaveLastReturnedWith"

@send
external toHaveNthReturnedWith: (expect<'a>, int, 'b) => unit = "toHaveNthReturnedWith"

@module("bun:test")
@scope(("expect"))
external extend: 'a => unit = "extend"

@module("bun:test")
@scope(("expect"))
external any: 'a => 'b = "any"

@module("bun:test")
@scope(("expect"))
external anything: unit => 'a = "anything"

@module("bun:test")
@scope(("expect"))
external arrayContaining: array<'a> => 'b = "arrayContaining"

@module("bun:test")
@scope(("expect"))
external objectContaining: 'a => 'b = "objectContaining"

@module("bun:test")
@scope(("expect"))
external stringContaining: string => 'a = "stringContaining"

@module("bun:test") @scope(("expect"))
external stringMatching: string => 'a = "stringMatching"

@send
external resolves: expect<'a> => expect<'a> = "resolves"

@send
external rejects: expect<'a> => expect<'a> = "rejects"
