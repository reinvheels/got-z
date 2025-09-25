/**
 * Creates a delay for the specified number of milliseconds using setTimeout.
 *
 * @param ms - The number of milliseconds to delay
 * @returns A Promise that resolves after the specified delay
 *
 * @example
 * ```typescript
 * // Delay for 1 second
 * await delay(1000);
 * console.log('This runs after 1 second');
 *
 * // Use in async functions
 * async function example() {
 *   console.log('Starting...');
 *   await delay(500);
 *   console.log('Half second later...');
 * }
 * ```
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}