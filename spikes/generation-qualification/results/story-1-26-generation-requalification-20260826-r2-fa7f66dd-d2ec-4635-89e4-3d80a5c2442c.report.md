# Generation Structural Qualification

- Run: `fa7f66dd-d2ec-4635-89e4-3d80a5c2442c`
- Calls: 46/63

| Role | Model | Trials | Direct valid | Decision |
| --- | --- | ---: | ---: | --- |
| primary | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 20 | 20/20 | GO |
| fallback | `@cf/openai/gpt-oss-20b` | 20 | 19/20 | GO |

Primary and fallback results are independent. A scheduled call may retry once only after a transient provider_error or timeout attempt — never after an output classification — and the trial counts its final attempt; no replacement, repair, coercion, or prose extraction is allowed.

