# Implementation Plan: Fix LLM JSON Response Markdown Wrapping

## Problem Description

LLMs occasionally wrap JSON responses in markdown code blocks (e.g., ````json ... ```), causing `JSON.parse` to fail with errors like:

```
SyntaxError: Unexpected token '`', "

```json
{
"... is not valid JSON
```

This error propagates through the call chain:
1. `generateObject` in LLM provider
2. Suggestions generation API (`src/app/api/suggestions/route.ts`)
3. Chat frontend

### Root Cause Analysis

The `repairJson` function from `@toolsycc/json-repair` is already in use with `extractJson: true`, but the extraction doesn't reliably strip markdown code block markers before parsing.

## Affected Files

### Primary Implementation Files (Require Direct Fix)

| File | Lines | Description |
|------|-------|-------------|
| `src/lib/models/providers/openai/openaiLLM.ts` | 197-229 | OpenAI `generateObject` method |
| `src/lib/models/providers/ollama/ollamaLLM.ts` | 186-220 | Ollama `generateObject` method |

### Files Inheriting from OpenAILLM (Will be Fixed Automatically)

| File | Extends | Status |
|------|---------|--------|
| `src/lib/models/providers/anthropic/anthropicLLM.ts` | OpenAILLM | ✅ Inherits fix |
| `src/lib/models/providers/gemini/geminiLLM.ts` | OpenAILLM | ✅ Inherits fix |
| `src/lib/models/providers/groq/groqLLM.ts` | OpenAILLM | ✅ Inherits fix |
| `src/lib/models/providers/lemonade/lemonadeLLM.ts` | OpenAILLM | ✅ Inherits fix |
| `src/lib/models/providers/lmstudio/lmstudioLLM.ts` | OpenAILLM | ✅ Inherits fix |

### Base Files (Do Not Require Changes)

| File | Reason |
|------|--------|
| `src/lib/models/base/llm.ts` | Abstract base class, no JSON parsing |

## Current Implementation Analysis

### OpenAI `generateObject` (lines 215-226)

```typescript
// CURRENT
if (response.choices && response.choices.length > 0) {
  try {
    return input.schema.parse(
      JSON.parse(
        repairJson(response.choices[0].message.content!, {
          extractJson: true,
        }) as string,
      ),
    ) as T;
  } catch (err) {
    throw new Error(`Error parsing response from OpenAI: ${err}`);
  }
}
```

### Ollama `generateObject` (lines 210-219)

```typescript
// CURRENT
try {
  return input.schema.parse(
    JSON.parse(
      repairJson(response.message.content, {
        extractJson: true,
      }) as string,
    ),
  ) as T;
} catch (err) {
  throw new Error(`Error parsing response from Ollama: ${err}`);
}
```

## Implementation Approach

### Step 1: Create Utility Function

Create `src/lib/utils/json.ts` with a robust markdown stripping function:

```typescript
import { repairJson } from '@toolsycc/json-repair';

/**
 * Sanitizes LLM JSON responses by stripping markdown code block wrappers.
 * Handles formats like:
 *   ```json ... ```
 *   ``` ... ```
 * 
 * @param response - Raw LLM response string
 * @returns Sanitized JSON string ready for JSON.parse
 */
export function sanitizeJsonResponse(response: string): string {
  // Pattern to match markdown code blocks with optional language identifier
  const markdownPattern = /^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$/i;
  
  const match = response.match(markdownPattern);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return response.trim();
}

/**
 * Parses JSON from LLM responses with robust error handling.
 * First sanitizes markdown wrappers, then uses repairJson for recovery.
 * 
 * @param response - Raw LLM response string
 * @returns Parsed JSON object
 * @throws Error if parsing fails after sanitization and repair
 */
export function parseJsonResponse<T>(response: string): T {
  // Step 1: Sanitize markdown wrappers
  const sanitized = sanitizeJsonResponse(response);
  
  // Step 2: Use repairJson with extractJson for additional recovery
  const repaired = repairJson(sanitized, { extractJson: true }) as string;
  
  // Step 3: Parse and validate
  try {
    return JSON.parse(repaired) as T;
  } catch (err) {
    throw new Error(`Failed to parse JSON response: ${err}`);
  }
}
```

### Step 2: Update OpenAI `generateObject`

**Before:**
```typescript
if (response.choices && response.choices.length > 0) {
  try {
    return input.schema.parse(
      JSON.parse(
        repairJson(response.choices[0].message.content!, {
          extractJson: true,
        }) as string,
      ),
    ) as T;
  } catch (err) {
    throw new Error(`Error parsing response from OpenAI: ${err}`);
  }
}
```

**After:**
```typescript
if (response.choices && response.choices.length > 0) {
  try {
    const content = response.choices[0].message.content!;
    const sanitized = sanitizeJsonResponse(content);
    const repaired = repairJson(sanitized, { extractJson: true }) as string;
    return input.schema.parse(JSON.parse(repaired)) as T;
  } catch (err) {
    throw new Error(`Error parsing response from OpenAI: ${err}`);
  }
}
```

### Step 3: Update Ollama `generateObject`

**Before:**
```typescript
try {
  return input.schema.parse(
    JSON.parse(
      repairJson(response.message.content, {
        extractJson: true,
      }) as string,
    ),
  ) as T;
} catch (err) {
  throw new Error(`Error parsing response from Ollama: ${err}`);
}
```

**After:**
```typescript
try {
  const sanitized = sanitizeJsonResponse(response.message.content);
  const repaired = repairJson(sanitized, { extractJson: true }) as string;
  return input.schema.parse(JSON.parse(repaired)) as T;
} catch (err) {
  throw new Error(`Error parsing response from Ollama: ${err}`);
}
```

### Step 4: Create Unit Tests

Create `src/lib/utils/json.test.ts`:

```typescript
import { sanitizeJsonResponse } from './json';

describe('sanitizeJsonResponse', () => {
  it('should pass through plain JSON unchanged', () => {
    const input = '{"key": "value"}';
    expect(sanitizeJsonResponse(input)).toBe('{"key": "value"}');
  });

  it('should strip ```json code blocks', () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(sanitizeJsonResponse(input)).toBe('{"key": "value"}');
  });

  it('should strip ``` code blocks without language', () => {
    const input = '```\n{"key": "value"}\n```';
    expect(sanitizeJsonResponse(input)).toBe('{"key": "value"}');
  });

  it('should handle extra whitespace', () => {
    const input = '  ```json   \n{"key": "value"}\n  ```  ';
    expect(sanitizeJsonResponse(input)).toBe('{"key": "value"}');
  });

  it('should handle JSON with special characters', () => {
    const input = '```json\n{"message": "Hello \\"World\\""}\n```';
    expect(sanitizeJsonResponse(input)).toBe('{"message": "Hello \\"World\\""}');
  });

  it('should handle nested JSON', () => {
    const input = '```json\n{"nested": {"key": "value"}, "array": [1, 2, 3]}\n```';
    expect(sanitizeJsonResponse(input)).toBe('{"nested": {"key": "value"}, "array": [1, 2, 3]}');
  });

  it('should return trimmed input for non-code-block strings', () => {
    const input = '  plain text  ';
    expect(sanitizeJsonResponse(input)).toBe('plain text');
  });
});
```

## Potential Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| `sanitizeJsonResponse` incorrectly strips non-JSON content | Only matches explicit code block pattern; falls back to original if no match |
| `repairJson` itself fails | Wrapped in try/catch that throws descriptive error |
| Regex edge cases (nested code blocks) | Pattern uses non-greedy matching; JSON.parse validates result |
| Performance impact | Minimal - single regex check before existing repairJson logic |

## Testing Strategy

1. **Unit Tests**: Test `sanitizeJsonResponse` with various input formats
2. **Integration Tests**: Test `generateObject` with mocked LLM responses containing markdown
3. **Manual Verification**: Test suggestions API with various LLM providers

## Files to Modify

```
src/lib/utils/json.ts                          [NEW]
src/lib/utils/json.test.ts                     [NEW]
src/lib/models/providers/openai/openaiLLM.ts   [MODIFY: lines 215-227]
src/lib/models/providers/ollama/ollamaLLM.ts   [MODIFY: lines 210-220]
docs/architecture/LLM_RESPONSE_PROCESSING.md  [MODIFY: add section]
```

## Rollout Order

1. Create `src/lib/utils/json.ts` with `sanitizeJsonResponse` function
2. Update OpenAI `generateObject` to use sanitization
3. Update Ollama `generateObject` to use sanitization
4. Add unit tests for `sanitizeJsonResponse`
5. Update `LLM_RESPONSE_PROCESSING.md` documentation
6. Test with suggestions API and various LLM providers