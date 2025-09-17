import chalk from "chalk";

class Logger {
  static info(message: string): void {
    console.log(`${chalk.blue("ℹ")} ${chalk.blue(message)}`);
  }

  static success(message: string): void {
    console.log(`${chalk.green("✔")} ${chalk.green(message)}`);
  }

  static warn(message: string): void {
    console.log(`${chalk.yellow("⚠")} ${chalk.yellow(message)}`);
  }

  static error(message: string, error?: unknown): void {
    console.error(`${chalk.red("✖")} ${chalk.red(message)}`);
    if (error) {
      if (error instanceof Error) {
        console.error(chalk.gray(error.stack || error.message));
      } else {
        console.error(chalk.gray(JSON.stringify(error, null, 2)));
      }
    }
  }

  static debug(message: string): void {
    if (process.env.DEBUG === "true") {
      console.log(`${chalk.magenta("🐞")} ${chalk.magenta(message)}`);
    }
  }
}

export default Logger;
