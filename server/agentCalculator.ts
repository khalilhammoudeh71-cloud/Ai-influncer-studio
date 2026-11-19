/** Small arithmetic parser. No JavaScript evaluation, variables, imports or system access. */
export function calculate(expression: unknown): number {
  if (typeof expression !== 'string' || !expression.trim() || expression.length > 1000) throw new Error('Use an arithmetic expression under 1000 characters.');
  const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-z]+|\*\*|[+\-*/%^(),]/gi) || [];
  if (tokens.join('') !== expression.replace(/\s/g, '')) throw new Error('Unsupported calculator syntax.');
  let pos = 0;
  let operations = 0;
  const peek = () => tokens[pos];
  const take = () => tokens[pos++];
  const checked = (value: number) => {
    if (++operations > 300 || !Number.isFinite(value)) throw new Error('Calculation is too complex or has a non-finite result.');
    return value;
  };
  function primary(): number {
    const token = take();
    if (token === '(') {
      const value = addition();
      if (take() !== ')') throw new Error('Missing closing parenthesis.');
      return value;
    }
    if (token && /^\d|^\.\d/.test(token)) return checked(Number(token));
    if (token === 'pi') return Math.PI;
    if (token === 'e') return Math.E;
    const functions: Record<string, (...args: number[]) => number> = { abs: Math.abs, sqrt: Math.sqrt, round: Math.round, floor: Math.floor, ceil: Math.ceil, min: Math.min, max: Math.max, sum: (...args) => args.reduce((a, b) => a + b, 0), avg: (...args) => args.reduce((a, b) => a + b, 0) / args.length };
    if (!token || !Object.prototype.hasOwnProperty.call(functions, token) || take() !== '(') throw new Error('Unsupported calculator function.');
    const args = [addition()];
    while (peek() === ',') { take(); args.push(addition()); }
    if (take() !== ')' || (!['min', 'max', 'sum', 'avg'].includes(token) && args.length !== 1)) throw new Error('Invalid function arguments.');
    return checked(functions[token](...args));
  }
  function power(): number {
    const value = primary();
    if (peek() === '^' || peek() === '**') { take(); return checked(value ** unary()); }
    return value;
  }
  function unary(): number {
    if (peek() === '+') { take(); return unary(); }
    if (peek() === '-') { take(); return -unary(); }
    return power();
  }
  function multiplication(): number {
    let value = unary();
    while (['*', '/', '%'].includes(peek())) { const op = take(); const right = unary(); value = checked(op === '*' ? value * right : op === '/' ? value / right : value % right); }
    return value;
  }
  function addition(): number {
    let value = multiplication();
    while (peek() === '+' || peek() === '-') { const op = take(); const right = multiplication(); value = checked(op === '+' ? value + right : value - right); }
    return value;
  }
  const result = addition();
  if (pos !== tokens.length) throw new Error('Unexpected calculator input.');
  return checked(result);
}
