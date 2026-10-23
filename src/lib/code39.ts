// Code 39 barcode encoding. Asset tags use A-Z, 0-9 and "-", all of which
// Code 39 supports, so the label on screen scans back to the real tag.
//
// Each character is 9 elements alternating bar/space, starting with a bar;
// "1" marks a wide element. Characters are separated by a narrow space, and
// the whole code is framed by the "*" start/stop character.
const PATTERNS: Record<string, string> = {
  "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000", "4": "000110001",
  "5": "100110000", "6": "001110000", "7": "000100101", "8": "100100100", "9": "001100100",
  A: "100001001", B: "001001001", C: "101001000", D: "000011001", E: "100011000",
  F: "001011000", G: "000001101", H: "100001100", I: "001001100", J: "000011100",
  K: "100000011", L: "001000011", M: "101000010", N: "000010011", O: "100010010",
  P: "001010010", Q: "000000111", R: "100000110", S: "001000110", T: "000010110",
  U: "110000001", V: "011000001", W: "111000000", X: "010010001", Y: "110010000",
  Z: "011010000", "-": "010000101", ".": "110000100", " ": "011000100", "*": "010010100",
};

export interface Bar {
  x: number;
  width: number;
}

/**
 * Returns the bars (in narrow-module units) for text, plus the total width.
 * Characters Code 39 cannot encode are dropped.
 */
export function code39(text: string, wide = 3): { bars: Bar[]; width: number } {
  const chars = ["*", ...text.toUpperCase().split("").filter((c) => c in PATTERNS), "*"];
  const bars: Bar[] = [];
  let x = 0;
  chars.forEach((c, i) => {
    const pattern = PATTERNS[c] ?? "";
    for (let e = 0; e < pattern.length; e++) {
      const w = pattern[e] === "1" ? wide : 1;
      if (e % 2 === 0) bars.push({ x, width: w });
      x += w;
    }
    if (i < chars.length - 1) x += 1; // inter-character gap
  });
  return { bars, width: x };
}
