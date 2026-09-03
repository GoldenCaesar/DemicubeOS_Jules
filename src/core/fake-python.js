function splitArguments(source) {
  const argumentsList = [];
  let current = "";
  let quote = null;
  let depth = 0;

  for (const character of source) {
    if (quote) {
      current += character;
      if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      current += character;
    } else if (character === "(") {
      depth += 1;
      current += character;
    } else if (character === ")") {
      depth -= 1;
      current += character;
    } else if (character === "," && depth === 0) {
      argumentsList.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  if (current.trim()) argumentsList.push(current.trim());
  return argumentsList;
}

export class FakePython {
  constructor(fileSystem) {
    this.fileSystem = fileSystem;
  }

  run(path) {
    const node = this.fileSystem.resolve(path);
    if (!node || node.type !== "file" || node.format !== "py") return { error: "Python file not found: " + path };
    const scope = new Map();
    const output = [];
    const lines = node.content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      const source = lines[index].replace(/#.*/, "").trim();
      if (!source) continue;
      try {
        if (source.startsWith("if ")) {
          const match = source.match(/^if\s+(.+):\s*$/);
          if (!match) throw new Error("invalid if statement");
          const condition = this.evaluate(match[1], scope);
          if (!condition) index += 1;
          continue;
        }
        if (/^(import|from|exec|eval|class|for|while|def|with|try|raise)\b/.test(source)) {
          throw new Error("unsupported or unsafe statement");
        }
        const assignment = source.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
        if (assignment) {
          scope.set(assignment[1], this.evaluate(assignment[2], scope));
          continue;
        }
        const call = source.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
        if (!call) throw new Error("unsupported syntax");
        const name = call[1];
        const argumentsList = splitArguments(call[2]).map((argument) => this.evaluate(argument, scope));
        if (name === "print") {
          output.push(argumentsList.map((value) => String(value)).join(" "));
        } else if (name === "write_file") {
          if (argumentsList.length !== 2 || !this.fileSystem.write(String(argumentsList[0]), argumentsList[1])) throw new Error("write_file failed");
        } else if (name === "append_file") {
          if (argumentsList.length !== 2 || !this.fileSystem.append(String(argumentsList[0]), argumentsList[1])) throw new Error("append_file failed");
        } else if (name === "rename") {
          if (argumentsList.length !== 2 || !this.fileSystem.move(String(argumentsList[0]), String(argumentsList[1]))) throw new Error("rename failed");
        } else if (name === "read_file") {
          if (argumentsList.length !== 1) throw new Error("read_file expects one path");
          output.push(this.fileSystem.read(String(argumentsList[0])) ?? "File not found");
        } else if (name === "list_files") {
          if (argumentsList.length !== 1) throw new Error("list_files expects one path");
          const entries = this.fileSystem.list(String(argumentsList[0]));
          if (!entries) throw new Error("directory not found");
          output.push(entries.map((entry) => entry.name).join("  "));
        } else {
          throw new Error("function not allowed: " + name);
        }
      } catch (error) {
        return { output, error: "line " + (index + 1) + ": " + error.message };
      }
    }
    return { output };
  }

  evaluate(expression, scope) {
    const trimmed = expression.trim();
    if (/^(['"]).*\1$/.test(trimmed)) return trimmed.slice(1, -1);
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
    if (scope.has(trimmed)) return scope.get(trimmed);
    const functionCall = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/);
    if (functionCall && functionCall[1] === "read_file") {
      const argumentsList = splitArguments(functionCall[2]);
      if (argumentsList.length !== 1) throw new Error("read_file expects one path");
      return this.fileSystem.read(String(this.evaluate(argumentsList[0], scope))) ?? "";
    }
    if (functionCall && ["len", "str"].includes(functionCall[1])) {
      const argumentsList = splitArguments(functionCall[2]);
      if (argumentsList.length !== 1) throw new Error(functionCall[1] + " expects one value");
      const value = this.evaluate(argumentsList[0], scope);
      return functionCall[1] === "len" ? String(value).length : String(value);
    }
    for (const operator of ["==", "!=", ">=", "<=", ">", "<"]) {
      const parts = this.splitOperator(trimmed, operator);
      if (parts) {
        const left = this.evaluate(parts[0], scope);
        const right = this.evaluate(parts[1], scope);
        if (operator === "==") return left === right;
        if (operator === "!=") return left !== right;
        if (operator === ">=") return left >= right;
        if (operator === "<=") return left <= right;
        if (operator === ">") return left > right;
        return left < right;
      }
    }
    if (this.hasTopLevelOperator(trimmed, "+") && /["'A-Za-z_]/.test(trimmed)) {
      return this.splitTopLevel(trimmed, "+").map((part) => this.evaluate(part, scope)).reduce((left, right) => left + right);
    }
    if (/^[\d\sA-Za-z_+*/().-]+$/.test(trimmed)) {
      const tokens = trimmed.match(/[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?|[()+*/-]/g) || [];
      if (tokens.join("") !== trimmed.replace(/\s/g, "")) throw new Error("invalid arithmetic");
      return this.calculate(tokens, scope);
    }
    throw new Error("unsupported expression");
  }

  splitTopLevel(source, separator) {
    const parts = [];
    let start = 0;
    let quote = null;
    let depth = 0;
    for (let index = 0; index < source.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === "'" || character === '"') quote = character;
      else if (character === "(") depth += 1;
      else if (character === ")") depth -= 1;
      else if (character === separator && depth === 0) {
        parts.push(source.slice(start, index).trim());
        start = index + 1;
      }
    }
    parts.push(source.slice(start).trim());
    return parts;
  }

  hasTopLevelOperator(source, operator) {
    return this.splitTopLevel(source, operator).length > 1;
  }

  splitOperator(source, operator) {
    let quote = null;
    let depth = 0;
    for (let index = 0; index <= source.length - operator.length; index += 1) {
      const character = source[index];
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === "'" || character === '"') quote = character;
      else if (character === "(") depth += 1;
      else if (character === ")") depth -= 1;
      else if (depth === 0 && source.startsWith(operator, index)) {
        return [source.slice(0, index).trim(), source.slice(index + operator.length).trim()];
      }
    }
    return null;
  }

  calculate(tokens, scope) {
    const values = [];
    const operators = [];
    const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };
    const apply = () => {
      const operator = operators.pop();
      const right = values.pop();
      const left = values.pop();
      if (operator === "+") values.push(left + right);
      if (operator === "-") values.push(left - right);
      if (operator === "*") values.push(left * right);
      if (operator === "/") values.push(left / right);
    };
    for (const token of tokens) {
      if (/^\d/.test(token)) values.push(Number(token));
      else if (/^[A-Za-z_]/.test(token)) {
        if (!scope.has(token) || typeof scope.get(token) !== "number") throw new Error("numeric value required: " + token);
        values.push(scope.get(token));
      }
      else if (token === "(") operators.push(token);
      else if (token === ")") {
        while (operators.at(-1) !== "(") apply();
        operators.pop();
      } else {
        while (operators.length && operators.at(-1) !== "(" && precedence[operators.at(-1)] >= precedence[token]) apply();
        operators.push(token);
      }
    }
    while (operators.length) apply();
    return values[0];
  }
}