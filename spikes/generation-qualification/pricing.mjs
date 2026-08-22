export const PRICING_AS_OF = "2026-08-22";
export const PRICING_SOURCE = "https://developers.cloudflare.com/workers-ai/platform/pricing/";
export const MODEL_PRICING = Object.freeze({
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": Object.freeze({ input_per_million_usd: 0.29, output_per_million_usd: 2.25, exact: true }),
  "@cf/openai/gpt-oss-20b": Object.freeze({ input_per_million_usd: 0.2, output_per_million_usd: 0.3, exact: true }),
});
export const BUDGET_PRICING = Object.freeze({
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": MODEL_PRICING["@cf/meta/llama-3.3-70b-instruct-fp8-fast"],
  "@cf/openai/gpt-oss-20b": MODEL_PRICING["@cf/openai/gpt-oss-20b"],
});
export const PRICING_DISCLOSURE = "Cloudflare publishes $0.29/M input and $2.25/M output for the selected 70B endpoint and $0.20/M input and $0.30/M output for the selected gpt-oss-20b endpoint; both bindings are exact published rates.";
