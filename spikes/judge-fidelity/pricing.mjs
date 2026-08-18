// Shared pricing constants for the judge recovery spike.
// Import from this module instead of duplicating in run.mjs or qualification.mjs.

export const PRICING_AS_OF = "2026-07-29";
export const PRICING_SOURCE = "https://developers.cloudflare.com/workers-ai/platform/pricing/";
export const NEURON_USD = 0.000011;
export const FREE_NEURONS_PER_DAY = 10_000;
export const MODEL_PRICING = Object.freeze({
  "@cf/openai/gpt-oss-120b": Object.freeze({ input_per_million_usd: 0.35, output_per_million_usd: 0.75 }),
  "@cf/openai/gpt-oss-20b": Object.freeze({ input_per_million_usd: 0.20, output_per_million_usd: 0.30 }),
});
