import { defineRefiner, type Refiner } from "jsr:@vim-fall/std/refiner";
import { join } from "jsr:@std/path@^1.0.8";
import type { Detail as ShellDetail } from "jsr:@tennashi/fall-source-shell-command";

export type Detail = {
  path: string;
  previewPath: string;
};

export type GhqOptions = {
  ghqRoot?: string;
};

const decoder = new TextDecoder();

function expandHome(path: string): string {
  if (path.startsWith("~")) {
    const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE");
    if (!home) throw new Error("can't find home dir");
    return join(home, path.slice(1));
  }
  return path;
}

function ghqRoot(dir?: string): string {
  if (dir) {
    return dir;
  }

  const fetchGhqRoot = new Deno.Command("ghq", {
    args: ["root"],
  });
  const { stdout } = fetchGhqRoot.outputSync();
  const output = decoder.decode(stdout).trimEnd();

  return expandHome(output);
}

export function ghq(
  options: Readonly<GhqOptions>,
): Refiner<ShellDetail, Detail> {
  const root = ghqRoot(options.ghqRoot);

  return defineRefiner(async function* (_denops, { items }, { signal }) {
    for await (const item of items) {
      signal?.throwIfAborted();

      const line = item.detail.line;

      yield {
        ...item,
        detail: {
          ...item.detail,
          path: join(root, line),
          previewPath: join(root, line, "/README.md"),
        },
      };
    }
  });
}
