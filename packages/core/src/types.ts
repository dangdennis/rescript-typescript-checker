export type DiagnosticLevel = "error" | "warning" | "info";

export interface Diagnostic {
  level: DiagnosticLevel;
  message: string;
  file: string;
  line: number;
  column: number;
  code?: string;
}

export interface ExternalAttributes {
  module?: string;
  scope?: string[];
  val?: boolean;
  send?: boolean;
  new?: boolean;
  get?: boolean;
  set?: boolean;
  as?: string;
}

export interface ExternalDecl {
  name: string;
  binding: string;
  resType: string;
  attributes: ExternalAttributes;
  file: string;
  line: number;
  column: number;
}

export interface CheckOptions {
  cwd?: string;
  dir?: string;
  json?: boolean;
}

export interface CheckSummary {
  externals: number;
  errors: number;
  warnings: number;
}

export interface CheckResult {
  summary: CheckSummary;
  diagnostics: Diagnostic[];
}
