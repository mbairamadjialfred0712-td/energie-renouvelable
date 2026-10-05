import { createOpenAI } from "@ai-sdk/openai";
import { NoObjectGeneratedError, Output, streamText } from "ai";
import { z } from "zod";
import type { ProjectAnalysisResult } from "@/features/projects/project-record";
import { createGatewayRunIdFetch } from "./run-id.server.ts";

const itemSchema = z.object({
  title: z.string(),
  explanation: z.string(),
  fieldReferences: z.array(z.string()),
});

const analysisSchema = z.object({
  missingInformation: z.array(itemSchema),
  declaredAssumptions: z.array(itemSchema),
  verificationPoints: z.array(itemSchema),
  scopeNote: z.string(),
});

function recoverStructuredOutput(text: string | undefined): ProjectAnalysisResult | null {
  if (!text) return null;
  try {
    const parsed = analysisSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function runProjectPreAnalysis(snapshot: unknown, subject: "project" | "resource" = "project") {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Le service de pré-analyse n’est pas configuré.");

  const runIdFetch = createGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    maxRetries: 0,
    output: Output.object({ schema: analysisSchema, name: "project_pre_analysis" }),
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
    system: "Vous assistez des professionnels de l’énergie. Vous examinez exclusivement les données sauvegardées. N’inventez aucune valeur, mesure, formule, production, coût, rendement ou conclusion scientifique. Ne calculez aucun résultat énergétique ou financier. Distinguez strictement données fournies et hypothèses déclarées. Signalez les informations absentes et les vérifications nécessaires. Les références de champs doivent reprendre les clés présentes dans l’instantané.",
    prompt: `${subject === "resource" ? "Objet : fiche de ressource énergétique (solaire, éolienne, biomasse ou déchets) d’une localité. Vérifiez la cohérence des unités, la présence de la source, de la période, de la hauteur de mesure le cas échéant, et la distinction entre potentiel théorique, technique et exploitable. " : ""}Produisez une pré-analyse de complétude et de vérification en trois listes. Restez factuel, concis et prudent. Instantané sauvegardé :\n${JSON.stringify(snapshot)}`,
  });

  try {
    const output = await result.output;
    return { output, runId: runIdFetch.getRunId() };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const recovered = recoverStructuredOutput(error.text);
      if (recovered) return { output: recovered, runId: runIdFetch.getRunId() };
    }
    throw error;
  }
}