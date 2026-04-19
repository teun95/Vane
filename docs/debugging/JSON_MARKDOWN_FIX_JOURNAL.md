# Debugging Journal: JSON Markdown Parsing Issue

## Problem

```
SyntaxError: Unexpected token '`', "
```json
{"...
```

LLM responses wrapped in markdown code blocks causing `JSON.parse` to fail.

---

## Investigation Steps

### 1. Initial Analysis
- Error showed backticks present when `JSON.parse` called
- `sanitizeJsonResponse` and `repairJson` were being used
- Suspected regex pattern issue

### 2. Regex Fix (First Attempt)
**File**: `src/lib/utils/json.ts`

**Problem**: Old regex required markdown to span entire string:
```javascript
/^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i
```

**Fix**: Remove anchors to find code blocks anywhere:
```javascript
/```(?:json)?\s*([\s\S]*?)```/i
```

### 3. Debug Logging Added
Added console logs to both LLM providers:
- `[DEBUG OpenAI generateObject] START`
- `[DEBUG OpenAI] Raw content:`
- `[DEBUG OpenAI] After sanitizeJsonResponse:`
- `[DEBUG OpenAI] After repairJson:`

### 4. Key Discovery
Debug logs revealed the error occurred **BEFORE** my logs appeared, indicating the issue was in **OpenAI SDK internals**, not my code.

Stack trace showed: `bm.parseResponse (.next/server/chunks/403.js:1:13511)`

### 5. Root Cause Identified
Using `chat.completions.parse()` causes the SDK to internally parse JSON. When model returns markdown, the SDK's `parseResponse` fails **before** my code sees the content.

### 6. Final Fix
**File**: `src/lib/models/providers/openai/openaiLLM.ts`

Changed `chat.completions.parse()` → `chat.completions.create()` to capture raw content first, then apply sanitization.

---

## Files Modified

| File | Change |
|------|--------|
| `src/lib/utils/json.ts` | Fixed regex pattern |
| `src/lib/utils/json.test.ts` | Added test cases for text around code blocks |
| `src/lib/models/providers/openai/openaiLLM.ts` | Use `create()` instead of `parse()`, added debug logging |
| `src/lib/models/providers/ollama/ollamaLLM.ts` | Added debug logging |

---

## Next Steps

1. Rebuild Docker image
2. Test with markdown-wrapped JSON response
3. Verify debug logs show content at each stage
4. Remove debug logs if fix confirmed
