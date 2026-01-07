@module("react")
external createElement: (string, 'props, array<'child>) => React.element = "createElement"

@module("fs")
external readFileSync: string => string = "readFileSync"

@val external math_pi: float = "Math.PI"
