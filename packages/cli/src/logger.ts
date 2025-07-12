const RED = `\x1b[31m`;
const YELLOW = `\x1b[33m`;
const GRAY = `\x1b[90m`;

const RED_BG = `\x1b[41m`;
const YELLOW_BG = `\x1b[43m`;

const RESET = `\x1b[0m`;

export function makeLogger(logLevel: "info" | "debug") {
  return {
    debug: ["debug"].includes(logLevel)
      ? (...args: unknown[]) => console.debug(`${GRAY}${args.join(" ")}${RESET}`)
      : () => {},
    info: ["debug", "info"].includes(logLevel) ? console.log : () => {},
    warn: (...args: unknown[]) =>
      console.warn(`${GRAY}${YELLOW_BG} WARN ${RESET}`, YELLOW, ...args, RESET),
    error: (...args: unknown[]) =>
      console.error(`${GRAY}${RED_BG} ERROR ${RESET}`, RED, ...args, RESET),
  };
}
