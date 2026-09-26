import type { ScientificInput } from "../simulation/contracts";
export function validateTraceability(inputs: ScientificInput[]) {
  return inputs.flatMap((input) => {
    const errors: string[] = [];
    if (!input.unit) errors.push(`${input.key}: unité manquante`);
    if (!input.isAssumption && !input.source) errors.push(`${input.key}: source manquante`);
    return errors;
  });
}
