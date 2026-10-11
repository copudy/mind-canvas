import Decimal from "decimal.js";
Decimal.set({ precision: 32, rounding: Decimal.ROUND_HALF_UP });
export function calculate(input: string): string {
  const s = input
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\s/g, "");
  if (!s || s.length > 500) throw new Error("請輸入有效算式（最多 500 字）");
  let p = 0,
    depth = 0;
  function primary(): Decimal {
    if (++depth > 64) throw new Error("括號層數過多");
    let n: Decimal;
    if (s[p] === "+" || s[p] === "-") {
      const sign = s[p++];
      n = primary();
      if (sign === "-") n = n.negated();
    } else if (s[p] === "(") {
      p++;
      n = add();
      if (s[p++] !== ")") throw new Error("括號不成對");
    } else {
      const match = s.slice(p).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) throw new Error("算式包含非法輸入");
      p += match[0].length;
      n = new Decimal(match[0]);
    }
    while (s[p] === "%") {
      p++;
      n = n.div(100);
    }
    depth--;
    return n;
  }
  function mul(): Decimal {
    let n = primary();
    while (s[p] === "*" || s[p] === "/") {
      const op = s[p++],
        r = primary();
      if (op === "/" && r.isZero()) throw new Error("不能除以零");
      n = op === "*" ? n.mul(r) : n.div(r);
      if (!n.isFinite() || n.abs().gt("1e100"))
        throw new Error("數值超過支援範圍");
    }
    return n;
  }
  function add(): Decimal {
    let n = mul();
    while (s[p] === "+" || s[p] === "-") {
      const op = s[p++],
        r = mul();
      n = op === "+" ? n.add(r) : n.sub(r);
    }
    return n;
  }
  const result = add();
  if (p !== s.length) throw new Error("算式包含非法輸入");
  if (!result.isFinite() || result.abs().gt("1e100"))
    throw new Error("數值超過支援範圍");
  return result.toSignificantDigits(20).toString();
}
