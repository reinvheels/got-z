/**
 * Generates all possible permutations of a given number of digits using a specified number of symbols.
 * 
 * @param digits - The number of positions/digits in each permutation
 * @param symbols - The number of different symbols/values that can be used (0 to symbols-1)
 * @returns A 2D array containing all possible permutations, where each inner array represents one permutation
 * 
 * @example
 * ```typescript
 * // Generate all permutations of 2 digits using 3 symbols (0, 1, 2)
 * const result = getPermutations(2, 3);
 * // Returns: [[0,0], [0,1], [0,2], [1,0], [1,1], [1,2], [2,0], [2,1], [2,2]]
 * ```
 */
export function getPermutations(digits: number, symbols: number): number[][] {
  const all: number[][] = [];
  const p: number[] = Array(digits).fill(0);
  for (let i = 0; i < symbols ** digits; i++) {
    let iRest = i;
    for (let l = 0; l < digits; l++) {
      const chunk = symbols ** (digits - l - 1);
      p[l] = Math.floor(iRest / chunk);
      iRest -= p[l] * chunk;
    }
    all.push([...p]);
  }
  return all;
}
