import { chmod, cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nodeVersion = "24.11.1";
const targetName = process.argv.slice(2).find((argument) => !argument.startsWith("--")) || hostTarget();
const skipBuild = process.argv.includes("--skip-build");

const targets = {
  "mac-arm64": { nodePlatform: "darwin", nodeArch: "arm64", archive: "tar.gz", executable: "bin/node" },
  "mac-x64": { nodePlatform: "darwin", nodeArch: "x64", archive: "tar.gz", executable: "bin/node" },
  "win-x64": { nodePlatform: "win", nodeArch: "x64", archive: "zip", executable: "node.exe" },
};

const target = targets[targetName];
if (!target) {
  console.error(`Unknown target: ${targetName}\nChoose one of: ${Object.keys(targets).join(", ")}`);
  process.exit(1);
}

const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));

function hostTarget() {
  if (process.platform === "darwin") return `mac-${process.arch}`;
  if (process.platform === "win32" && process.arch === "x64") return "win-x64";
  return "unsupported";
}

function run(command, args, options = {}) {
  // Windows requires shell:true to spawn .cmd/.bat files (e.g. npm.cmd). Without
  // it, modern Node throws EINVAL when launching such scripts.
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} exited with code ${result.status}`);
}

async function exists(file) {
  return stat(file).then(() => true, () => false);
}

async function download(url, destination) {
  console.log(`Downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  const temporary = `${destination}.download`;
  await writeFile(temporary, Buffer.from(await response.arrayBuffer()));
  await rm(destination, { force: true });
  await cp(temporary, destination);
  await rm(temporary, { force: true });
}

if (!skipBuild) {
  console.log("Building Next.js standalone server...");
  run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
}

const standaloneDir = path.join(projectRoot, ".next", "standalone");
if (!(await exists(path.join(standaloneDir, "server.js")))) {
  throw new Error("Missing .next/standalone/server.js. Run without --skip-build first.");
}

const distDir = path.join(projectRoot, "dist");
const bundleDir = path.join(distDir, `Mote-${packageJson.version}-${targetName}`);
const appDir = path.join(bundleDir, "app");
const runtimeDir = path.join(bundleDir, "runtime");
await mkdir(distDir, { recursive: true });
await rm(bundleDir, { recursive: true, force: true });
await mkdir(runtimeDir, { recursive: true });

await cp(standaloneDir, appDir, { recursive: true });
// Next copies build-time .env files into standalone output. A portable bundle
// must never distribute the developer's credentials or local configuration.
for (const entry of await readdir(appDir)) {
  if (entry === ".env" || entry.startsWith(".env.")) {
    await rm(path.join(appDir, entry), { force: true });
  }
}
await cp(path.join(projectRoot, ".next", "static"), path.join(appDir, ".next", "static"), { recursive: true });
if (await exists(path.join(projectRoot, "public"))) {
  await cp(path.join(projectRoot, "public"), path.join(appDir, "public"), { recursive: true });
}

const archiveBase = `node-v${nodeVersion}-${target.nodePlatform}-${target.nodeArch}`;
const archiveName = `${archiveBase}.${target.archive}`;
const cacheDir = path.join(projectRoot, ".portable-cache");
const archivePath = path.join(cacheDir, archiveName);
const extractedDir = path.join(cacheDir, archiveBase);
await mkdir(cacheDir, { recursive: true });
if (!(await exists(archivePath))) {
  await download(`https://nodejs.org/dist/v${nodeVersion}/${archiveName}`, archivePath);
}
if (!(await exists(extractedDir))) {
  console.log(`Extracting ${archiveName}`);
  run("tar", ["-xf", archivePath, "-C", cacheDir]);
}

const runtimeName = target.nodePlatform === "win" ? "node.exe" : "node";
await cp(path.join(extractedDir, target.executable), path.join(runtimeDir, runtimeName));
await cp(path.join(extractedDir, "LICENSE"), path.join(runtimeDir, "NODE-LICENSE.txt"));
if (target.nodePlatform !== "win") await chmod(path.join(runtimeDir, runtimeName), 0o755);

const templatesDir = path.join(projectRoot, "scripts", "portable");
const launchers = target.nodePlatform === "win"
  ? ["Start Mote.cmd", "Stop Mote.cmd", "Start-Mote.ps1", "Stop-Mote.ps1"]
  : ["Start Mote.command", "Stop Mote.command"];
for (const launcher of launchers) {
  const destination = path.join(bundleDir, launcher);
  await cp(path.join(templatesDir, launcher), destination);
  if (target.nodePlatform !== "win") await chmod(destination, 0o755);
}

await writeFile(path.join(bundleDir, "README.txt"), [
  `Mote ${packageJson.version}`,
  "",
  target.nodePlatform === "win" ? "Double-click Start Mote.cmd to launch." : "Double-click Start Mote.command to launch.",
  target.nodePlatform === "win" ? "Double-click Stop Mote.cmd to stop." : "Double-click Stop Mote.command to stop.",
  "Open http://127.0.0.1:3000 if the browser does not open automatically.",
  "Your settings and creations are stored in the data and out folders beside this file.",
  "Do not share the data folder because it can contain API keys.",
  "",
].join("\n"));

for (const privatePath of [
  path.join(bundleDir, ".env"),
  path.join(bundleDir, "data"),
  path.join(bundleDir, "out"),
  path.join(appDir, ".env"),
  path.join(appDir, "data"),
  path.join(appDir, "out"),
]) {
  if (await exists(privatePath)) {
    throw new Error(`Refusing to package private path: ${privatePath}`);
  }
}

const outputArchive = path.join(distDir, `Mote-${packageJson.version}-${targetName}.zip`);
await rm(outputArchive, { force: true });
console.log(`Creating ${path.relative(projectRoot, outputArchive)}`);
if (process.platform === "darwin") {
  run("ditto", ["-c", "-k", "--norsrc", "--noextattr", "--keepParent", bundleDir, outputArchive]);
} else {
  // Windows: use bsdtar (tar.exe) instead of Compress-Archive. Compress-Archive's
  // ZipArchiveHelper opens files with restrictive sharing and aborts when a freshly
  // copied file is briefly locked by Windows Defender; worse, it surfaces that as a
  // non-terminating PowerShell error, so powershell.exe still exits 0 and the script
  // falsely reports success. bsdtar reads with shared access and returns a proper
  // non-zero exit code on real failures. -a infers zip format from the .zip suffix.
  run("tar", ["-a", "-c", "-f", outputArchive, "-C", distDir, path.basename(bundleDir)]);
}

console.log(`Portable bundle ready: ${outputArchive}`);
