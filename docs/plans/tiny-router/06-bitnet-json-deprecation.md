# 06 — BitNet / JSON Deprecation Path

This is optional and must happen after a tiny-router slice ships safely.

## Current BitNet/local-SLM files

- `lib/local-slm.js`
- `lib/local-slm-setup.js`
- `test/local-slm.test.js`
- README and CHANGELOG references to Phase 3 local BitNet planning

## Why not remove immediately

- It is a working fallback.
- Tests currently cover it.
- Removing it while tiny-router is unproven increases risk.

## Deprecation order

### Step 1: make tiny-router default-off but available

No BitNet removal.

### Step 2: prove domain-router replacement

Required:

- gold eval pass
- latency pass
- no high-risk downgrades
- fallback tests pass

### Step 3: stop using BitNet for domain routing

Change order:

```text
tiny-router -> heuristic -> legacy local SLM only if explicitly enabled
```

### Step 4: remove JSON planner dependency

Only if query planning works well enough with deterministic templates and follow-up actions.

Do not remove JSON planning if deep/code mode still needs it.

### Step 5: documentation update

Update:

- README
- CHANGELOG
- THIRD_PARTY_NOTICES if dependencies change

### Step 6: delete or isolate legacy files

Options:

1. Keep `local-slm.js` as legacy opt-in.
2. Move to `lib/legacy-local-slm.js`.
3. Delete only if no tests/use-cases remain.

## Removal acceptance

BitNet/JSON can be removed only if:

- no test requires it,
- tiny-router covers domain use-case,
- deterministic planner covers query planning use-case,
- README no longer promises BitNet setup,
- package remains installable without BitNet/Python setup.
