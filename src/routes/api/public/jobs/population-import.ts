import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/population-import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { runPopulationImport } = await import("@/lib/population-import.server");
        const result = await runPopulationImport("schedule", null);
        return Response.json(result, { status: result.status === "success" ? 200 : 502 });
      },
    },
  },
});
