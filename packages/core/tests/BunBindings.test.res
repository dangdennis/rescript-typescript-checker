open BunTest

type checkOptions = {dir: string}
type checkResult
type checkSummary

@module("../dist/index.js")
external checkBindings: checkOptions => Promise.t<checkResult> = "checkBindings"


@get
external summary: checkResult => checkSummary = "summary"

@get
external errors: checkSummary => int = "errors"

testDone("bun:test externals match @types/bun", done => {
  checkBindings({dir: "."})
  ->Promise.then(result => {
    let errorCount = result->summary->errors
    expect(errorCount)->toBe(0)
    done()
    Promise.resolve()
  })
  ->ignore
})
