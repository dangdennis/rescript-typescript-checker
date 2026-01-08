open BunTest

type checkOptions = {dir: string}

@module("../dist/index.js")
external checkBindings: checkOptions => Js.Promise.t<checkResult> = "checkBindings"

type checkResult
type checkSummary

@get
external summary: checkResult => checkSummary = "summary"

@get
external errors: checkSummary => int = "errors"

testDone("bun:test externals match @types/bun", done => {
  checkBindings({dir: "."})
  ->Js.Promise.then_(result => {
    let errorCount = result->summary->errors
    expect(errorCount)->toBe(0)
    done()
    Js.Promise.resolve()
  })
  ->ignore
})
