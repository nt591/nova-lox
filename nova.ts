import { readAll } from "https://deno.land/std@0.119.0/streams/conversion.ts";

class Nova {
  static hadError = false;

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
  }

  private static async runPrompt(): Promise<void> {
    while (true) {
      console.log("> ");
      const text = await readAll(Deno.stdin).trim();
      if (!text || text === "") break;
      this.run(text);
      this.hadError = false;
    }
  }

  private static run(source: string): void {
    const scanner = new Scanner(source);
    const tokens = scanner.scanTokens();

    for (const token of tokens) {
      console.log(token);
    }
  }

  private static error(line: number, message: string): void {
    this.report(line, "", message);
  }

  private static report(line: number, where: string, message: string): void {
    console.error(`[line ${line}] Error${where} : ${message}`);
    this.hadError = true;
  }
}

await Nova.main();
