import { readLines } from "https://deno.land/std@0.119.0/io/buffer.ts";
import { Interpreter } from "./Interpreter.ts";
import { Parser } from "./Parser.ts";
import { RuntimeError } from "./RuntimeError.ts";
import { Scanner } from "./Scanner.ts";
import { Stmt } from "./Stmt.ts";
import { Token } from "./Token.ts";
import { TokenType } from "./TokenType.ts";

export class Nova {
  static hadError = false;
  static hadRuntimeError = false;
  private static readonly interpreter = new Interpreter();

  static async main(): Promise<void> {
    const args = Deno.args;
    if (args.length > 1) {
      console.log("Usage: nova [script]");
      Deno.exit(64);
    } else if (args.length === 1) {
      await this.runFile(args[0]);
    } else {
      await this.runPrompt();
    }
  }

  private static async runFile(filename: string): Promise<void> {
    const text = await Deno.readTextFile(filename);
    this.run(text);
    if (this.hadError) Deno.exit(65);
    if (this.hadRuntimeError) Deno.exit(70);
  }

  private static async runPrompt(): Promise<void> {
    while (true) {
      const p = new TextEncoder().encode("> ");
      await Deno.stdout.write(p);
      const lines = await readLines(Deno.stdin);
      for await (const line of lines) {
        this.run(line);
      }
    }
  }

  private static run(source: string): void {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();
    const parser = new Parser(tokens);
    const statements: Array<Stmt> = parser.parse();

    if (this.hadError) return; // parser syntax error
    this.interpreter.interpret(statements);
    // placeholder
    // console.log(new AstPrinter().print(expression));
  }

  public static error(line: number, message: string): void {
    this.report(line, "", message);
  }

  public static runtimeError(error: RuntimeError): void {
    console.log(`${error.message}\n[line ${error.token.line}]`);
    this.hadRuntimeError = true;
  }

  public static errorAtToken(token: Token, message: string): void {
    if (token.type === TokenType.EOF) {
      this.report(token.line, " at end", message);
    } else {
      this.report(token.line, ` at '${token.lexeme}'`, message);
    }
  }

  private static report(line: number, where: string, message: string): void {
    console.error(`[line ${line}] Error${where} : ${message}`);
    this.hadError = true;
  }
}

await Nova.main();
