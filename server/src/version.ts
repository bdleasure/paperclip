import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

type PackageJson = {
  version?: string;
};

type BuildSource = "env" | "git" | "package";

export type ServerBuildInfo = {
  packageVersion: string;
  runtimeVersion: string;
  gitCommit: string | null;
  gitDescribe: string | null;
  source: BuildSource;
};

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as PackageJson;
const packageVersion = pkg.version ?? "0.0.0";
const repoRoot = path.resolve(import.meta.dirname, "..", "..");

function readGitValue(args: string[]): string | null {
  try {
    const value = execFileSync("git", ["-C", repoRoot, ...args], {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    }).trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function resolveServerBuildInfo(): ServerBuildInfo {
  const envRuntimeVersion = process.env.PAPERCLIP_BUILD_VERSION?.trim() || null;
  const envGitCommit = process.env.PAPERCLIP_GIT_COMMIT?.trim() || null;
  const envGitDescribe = process.env.PAPERCLIP_GIT_DESCRIBE?.trim() || null;
  if (envRuntimeVersion || envGitCommit || envGitDescribe) {
    return {
      packageVersion,
      runtimeVersion: envRuntimeVersion ?? envGitDescribe ?? (envGitCommit ? `${packageVersion}+git.${envGitCommit}` : packageVersion),
      gitCommit: envGitCommit,
      gitDescribe: envGitDescribe,
      source: "env",
    };
  }

  const gitCommit = readGitValue(["rev-parse", "HEAD"]);
  const gitDescribe = readGitValue(["describe", "--tags", "--always", "--dirty"]);
  if (gitCommit || gitDescribe) {
    return {
      packageVersion,
      runtimeVersion: gitDescribe ?? (gitCommit ? `${packageVersion}+git.${gitCommit.slice(0, 12)}` : packageVersion),
      gitCommit,
      gitDescribe,
      source: "git",
    };
  }

  return {
    packageVersion,
    runtimeVersion: packageVersion,
    gitCommit: null,
    gitDescribe: null,
    source: "package",
  };
}

export const serverBuildInfo = resolveServerBuildInfo();
export const serverVersion = serverBuildInfo.packageVersion;
export const serverRuntimeVersion = serverBuildInfo.runtimeVersion;
