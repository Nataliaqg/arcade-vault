import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);

let input;
try {
  input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
} catch {
  process.exit(0);
}

const filePath = input?.tool_input?.file_path;
if (!filePath || !existsSync(filePath)) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const rel = path.relative(root, path.resolve(filePath));
if (
  rel.startsWith("..") ||
  path.isAbsolute(rel) ||
  /(^|[\\/])(node_modules|\.next)([\\/]|$)/.test(rel)
) {
  process.exit(0);
}

const run = (args) =>
  spawnSync(`npx ${args.map((a) => JSON.stringify(a)).join(" ")}`, {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });

run(["prettier", "--write", "--ignore-unknown", rel]);

if (/\.(m?[jt]sx?|cjs)$/.test(rel)) {
  const result = run(["eslint", "--fix", rel]);
  if (result.status !== 0) {
    process.stderr.write(
      `ESLint errors in ${rel}:\n${result.stdout}${result.stderr}`,
    );
    process.exit(2);
  }
}
