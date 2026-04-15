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
