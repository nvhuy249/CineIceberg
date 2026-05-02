import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_ENDPOINT_PATTERNS = [
  /^trending\/(all|movie|tv)\/(day|week)$/,
  /^search\/multi$/,
  /^discover\/(movie|tv)$/,
  /^movie\/\d+$/,
  /^tv\/\d+$/,
];

type TmdbProxyBody = {
  endpoint?: string;
  params?: Record<string, string | number | boolean | null | undefined>;
};

const jsonResponse = (status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const tmdbReadToken = Deno.env.get("TMDB_READ_TOKEN");
  if (!tmdbReadToken) {
    return jsonResponse(500, {
      error: "Server is missing TMDB_READ_TOKEN secret.",
    });
  }

  let body: TmdbProxyBody;
  try {
    body = (await req.json()) as TmdbProxyBody;
  } catch {
    return jsonResponse(400, { error: "Invalid JSON body." });
  }

  const endpoint = body.endpoint?.trim() ?? "";
  if (!endpoint) {
    return jsonResponse(400, { error: "Missing endpoint." });
  }

  const allowed = ALLOWED_ENDPOINT_PATTERNS.some((pattern) =>
    pattern.test(endpoint),
  );
  if (!allowed) {
    return jsonResponse(400, {
      error: "Endpoint not allowed by proxy policy.",
    });
  }

  const query = new URLSearchParams();
  const params = body.params ?? {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    query.set(key, String(value));
  });

  if (!query.has("language")) query.set("language", "en-US");

  const tmdbUrl = `${TMDB_BASE_URL}/${endpoint}?${query.toString()}`;
  const tmdbResponse = await fetch(tmdbUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tmdbReadToken}`,
      Accept: "application/json",
    },
  });

  const text = await tmdbResponse.text();
  let parsed: unknown = {};
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  return jsonResponse(tmdbResponse.status, parsed);
});

