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

console.log(getPermutations(3, 10).join('\n'));
