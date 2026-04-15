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
