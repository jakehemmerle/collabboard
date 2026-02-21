# AI Cost Analysis — CollabBoard

## 1. Development & Testing Costs

### Actual Spend During Development

| Cost Category | Amount | Notes |
|---------------|--------|-------|
| Anthropic API (Claude Sonnet 4) — production AI agent | $0.98 | First 20 Cloud Function calls on Feb 18 (from LangSmith); 38 total traces as of Feb 20 |
| Anthropic API — all other usage (Workbench, other projects, additional collabboard traces) | $6.22 | Total Feb API spend is $7.20; $7.20 - $0.98 = $6.22 |
| Firebase (Firestore, RTDB, Hosting, Functions) | $0 | Within Blaze free tier during development |
| LangSmith | $0 | Free tier (38/5,000 traces used) |
| **Total Development Spend** | **$7.20** | Anthropic API billing for Feb 2026 (as of Feb 20) |

### Token Consumption (Production AI Agent)

*Source: LangSmith collabboard project — 38 traces through Feb 20, 2026 (original 20 from Feb 18 + 18 from Feb 20)*

| Metric | Value | Source |
|--------|-------|--------|
| Total API calls (traces) | 38 | LangSmith runs count |
| Total input tokens | 264,840 | LangSmith Cost & Tokens monitor (Feb 18 sample of 20 traces) |
| Total output tokens | 12,070 | LangSmith Cost & Tokens monitor (Feb 18 sample of 20 traces) |
| Average input tokens per command | ~13,242 | 264,840 / 20 traces (Feb 18 sample) |
| Average output tokens per command | ~604 | 12,070 / 20 traces (Feb 18 sample) |
| Average tool calls per command | ~4.4 | 88 total tool calls / 20 traces (Feb 18 sample) |
| Total tool calls (Feb 18) | 88 | 64 createStickyNote + 22 createFrame + 1 moveObject + 1 getBoardState; resizeObject also observed in later traces |
| Total LangSmith traces | 38 | LangSmith collabboard project |
| Total cost (Feb 18 sample) | $0.98 | LangSmith cost tracking (20 traces) |
| Average cost per command | $0.049 | $0.98 / 20 traces (Feb 18 sample) |
| P50 latency | 9.09s | LangSmith latency monitor |
| P99 latency | 403.79s | Single outlier trace (615s timeout); P99 dropped as more traces diluted the outlier |

### Anthropic Console Summary (Feb 2026, All Projects)

| Metric | Value |
|--------|-------|
| Total tokens in | 2,134,392 |
| Total tokens out | 46,735 |
| Total token cost | $7.20 |
| Models used | claude-sonnet-4-6 |
| Credit balance remaining | $7.74 / $15.98 |

---

## 2. Per-Command Cost Breakdown

### Token Estimates by Command Type

Using Claude Sonnet 4 pricing: **$3/M input tokens, $15/M output tokens**

*Validated against LangSmith actuals — real traces from 34 commands during dev/testing.*

| Command Type | Avg Input Tokens | Avg Output Tokens | Tool Calls | Cost/Command |
|-------------|-----------------|-------------------|------------|-------------|
| Simple creation ("Add a yellow sticky note...") | ~11,500 | ~350 | 1 | ~$0.04 |
| Manipulation ("Move the sticky note...", "Change color...") | ~12,500 | ~400 | 1-2 | ~$0.04 |
| Multi-object creation ("Create a frame titled...") | ~16,000 | ~600 | 2-4 | ~$0.06 |
| Complex template ("Create a SWOT analysis") | ~13,000 | ~800 | 5-10 | ~$0.05 |
| Heavy multi-step ("Some of the sticky notes...", multi-turn) | ~76,000 | ~3,500 | 10+ | ~$0.28 |

**Key observation from actuals:** Input tokens are much higher than initial estimates because each agentic step accumulates the full conversation history (system prompt + tool defs + all prior messages + tool results). A multi-step command with 5 tool calls means ~5 LLM round trips, each carrying the growing context.

**Fixed overhead per request:**

- System prompt: ~600 tokens
- Tool definitions (10 tools with Zod schemas): ~800 tokens
- Accumulated per agentic step: previous messages + tool call/result pairs (~200-500 tokens each)
- `getBoardState` response: ~50 tokens per board object
- `maxSteps: 10` allows up to 10 agentic reasoning cycles

---

## 3. Production Cost Projections

### Usage Assumptions

| Assumption | Value | Reasoning |
|-----------|-------|-----------|
| Sessions per user per month | 8 | ~2 sessions/week for an active whiteboard user |
| AI commands per session | 5 | Mix of simple creation and occasional templates |
| Average cost per command | $0.049 | Actual measured average from LangSmith ($0.98 / 20 commands) |
| Commands per user per month | 40 | 8 sessions x 5 commands |

### Monthly Cost Projections

| Scale | Active Users | AI Commands/Month | LLM Cost/Month | Firebase Cost/Month | Total/Month |
|-------|-------------|-------------------|----------------|--------------------|----|
| **100 users** | 100 | 4,000 | $196 | ~$0 (free tier) | **~$196** |
| **1,000 users** | 1,000 | 40,000 | $1,960 | ~$25 (Firestore reads/writes) | **~$1,985** |
| **10,000 users** | 10,000 | 400,000 | $19,600 | ~$200 (Firestore + Functions + bandwidth) | **~$19,800** |
| **100,000 users** | 100,000 | 4,000,000 | $196,000 | ~$2,000 (Firestore + Functions + bandwidth) | **~$198,000** |

### Cost Per User Per Month

| Scale | Cost/User/Month |
|-------|----------------|
| 100 users | $1.96 |
| 1,000 users | $1.99 |
| 10,000 users | $1.98 |
| 100,000 users | $1.98 |

LLM costs scale linearly — no volume discounts assumed. Per-user cost is essentially flat at ~$2/month.

**Note:** The $0.049/command average is skewed upward by a few heavy multi-step traces (the largest trace used 76,821 tokens and cost ~$0.28). In production, most commands would be simple creation/manipulation, bringing the weighted average closer to ~$0.04/command. With prompt caching enabled, costs could drop 40-50%.

---

## 4. Cost Optimization Strategies

### Already Implemented

- **Server-side tool execution**: Eliminates client-server round-trips for each tool call, reducing latency overhead
- **Batched Firestore writes**: 50ms flush window reduces write costs during rapid AI object creation
- **`maxSteps: 10` cap**: Prevents runaway agentic loops from burning tokens

### Could Implement at Scale

| Strategy | Potential Savings | Effort |
|----------|------------------|--------|
| **Prompt caching** (Anthropic beta) | ~50% on input tokens for repeated system prompt + tool defs | Low — enable cache headers on static prefix |
| **Model tiering**: Use Haiku for simple commands, Sonnet for complex | ~60% on simple commands | Medium — classify intent before routing |
| **Response caching**: Cache identical template commands | ~90% for cached hits | Medium — hash command + board state |
| **Streaming token limits**: Set `maxTokens` per command type | ~20% on verbose responses | Low — per-command config |
| **Board state summarization**: Compress `getBoardState` for large boards | ~30% on input tokens | Medium — smarter serialization |

### Break-Even Analysis

At ~$2/user/month LLM cost, a $10-15/user/month SaaS price point yields healthy margins. With prompt caching and model tiering optimizations, LLM cost could drop to ~$1/user/month, making a $5/user/month plan viable. The AI feature is a value-add on top of the core collaboration tool, not the primary cost driver.

---

## 5. Firebase Infrastructure Costs (Non-AI)

| Component | Free Tier Limit | Estimated Usage at 1K Users | Cost at 1K Users |
|-----------|----------------|----------------------------|-----------------|
| Firestore reads | 50K/day | ~200K/day (object sync) | ~$5/month |
| Firestore writes | 20K/day | ~50K/day (object creates/updates) | ~$8/month |
| Realtime Database | 10GB transfer/month | ~5GB (cursor sync) | ~$0 |
| Cloud Functions invocations | 2M/month | ~40K/month (AI calls) | ~$0 |
| Cloud Functions compute | 400K GB-sec/month | ~20K GB-sec (AI at 512MB x avg 5s) | ~$2/month |
| Hosting bandwidth | 10GB/month | ~20GB/month | ~$3/month |
| Auth | 50K MAU free | 1K MAU | $0 |
| **Total Firebase** | | | **~$18/month** |

---

## 6. Summary

### Development Costs (Actual)

| Category | Amount |
|----------|--------|
| CollabBoard AI agent (38 traces) | ~$2.50 |
| All Anthropic API usage (Feb 2026) | $7.20 |
| Firebase | $0 (free tier) |
| LangSmith | $0 (free tier) |

### Production Projections

| Category | At 1K Users/Month |
|----------|-------------------|
| LLM API (Claude Sonnet 4) | $1,960 |
| Firebase infrastructure | $18 |
| LangSmith observability | $0 (free tier) |
| **Total** | **~$1,978/month** |

**Key insight**: LLM API cost dominates at ~99% of total infrastructure spend. Prompt caching (40-50% savings on input tokens) and model tiering (Haiku for simple commands) are the highest-leverage optimizations. Firebase infrastructure is negligible in comparison.
