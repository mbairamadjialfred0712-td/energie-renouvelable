export type ScientificSource = { name: string; reference?: string; period?: string; quality?: string };
export type ScientificAssumption = { key: string; value: number | string | boolean; unit?: string; justification: string };
export type ScientificInput = { key: string; value: number | string; unit: string; source?: ScientificSource; isAssumption: boolean };
export type ScientificResult = { key: string; value: number; unit: string; method: string; inputSnapshot: ScientificInput[]; assumptions: ScientificAssumption[] };
export interface ScientificEngine<TInput, TResult extends ScientificResult[]> { readonly code: string; validate(input: TInput): Promise<string[]>; calculate(input: TInput): Promise<TResult>; }
