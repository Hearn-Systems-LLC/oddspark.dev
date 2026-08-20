export const PRICING_AS_OF = "2026-08-19";
export const PRICING_SOURCE = "https://developers.cloudflare.com/workers-ai/platform/pricing/";
export const MODEL_PRICING = Object.freeze({
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": Object.freeze({ input_per_million_usd: 0.29, output_per_million_usd: 2.25, exact: true }),
  "@cf/meta/llama-3.1-8b-instruct-fast": null,
});
export const BUDGET_PRICING = Object.freeze({
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": MODEL_PRICING["@cf/meta/llama-3.3-70b-instruct-fp8-fast"],
  "@cf/meta/llama-3.1-8b-instruct-fast": Object.freeze({ input_per_million_usd: 0.29, output_per_million_usd: 2.25, exact: false }),
});
export const PRICING_DISCLOSURE = "Cloudflare publishes $0.29/M input and $2.25/M output for the selected 70B endpoint. No exact price binding was found for the selected 8B fast endpoint, so its maximum is conservatively budgeted at the documented 70B rate; this is not observed 8B pricing.";
