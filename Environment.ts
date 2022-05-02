import { Token } from "./Token.ts";

type EnvironmenMap = Map<string, unknown>;

export class Environment {
  readonly #values: EnvironmenMap = new Map();
  readonly enclosing: Environment | null;

  constructor(enclosing: Environment | null) {
    this.enclosing = enclosing;
  }

  define(name: string, value: unknown): void {
    this.#values.set(name, value);
  }

  get(name: Token): unknown {
    if (this.#values.has(name.lexeme)) {
      return this.#values.get(name.lexeme);
    }

    // look up scope chain
    if (this.enclosing) return this.enclosing.get(name);

    throw new Error(`Unidentified variable ${name.lexeme}.`);
  }

  assign(name: Token, value: unknown): void {
    if (this.#values.has(name.lexeme)) {
      this.#values.set(name.lexeme, value);
      return;
    }

    if (this.enclosing) {
      this.enclosing.assign(name, value);
      return;
    }

    throw new Error(`Undefined variable ${name.lexeme}`);
  }
}
