import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const CHROMAPRINT_VERSION = "1.6.1";
const CHROMAPRINT_DOWNLOAD_ROOT = `https://github.com/acoustid/chromaprint/releases/download/v${CHROMAPRINT_VERSION}`;
const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const TOOLS_DIRECTORY = path.join(BACKEND_ROOT, "tools", "chromaprint");

const quotePowerShellLiteral = (value) => `'${String(value).replaceAll("'", "''")}'`;

const getPlatformPackage = () => {
    const platform = process.platform;
    const arch = process.arch;

    const packages = {
        "win32:x64": {
            archiveName: `chromaprint-fpcalc-${CHROMAPRINT_VERSION}-windows-x86_64.zip`,
            binaryName: "fpcalc.exe",
            archiveType: "zip",
        },
        "linux:x64": {
            archiveName: `chromaprint-fpcalc-${CHROMAPRINT_VERSION}-linux-x86_64.tar.gz`,
            binaryName: "fpcalc",
            archiveType: "tar.gz",
        },
        "linux:arm64": {
            archiveName: `chromaprint-fpcalc-${CHROMAPRINT_VERSION}-linux-arm64.tar.gz`,
            binaryName: "fpcalc",
            archiveType: "tar.gz",
        },
        "darwin:x64": {
            archiveName: `chromaprint-fpcalc-${CHROMAPRINT_VERSION}-macos-x86_64.tar.gz`,
            binaryName: "fpcalc",
            archiveType: "tar.gz",
        },
        "darwin:arm64": {
            archiveName: `chromaprint-fpcalc-${CHROMAPRINT_VERSION}-macos-arm64.tar.gz`,
            binaryName: "fpcalc",
            archiveType: "tar.gz",
        },
    };

    const platformPackage = packages[`${platform}:${arch}`];
    if (!platformPackage) {
        throw new Error(
            `Chromaprint fpcalc is not packaged for process.platform=${platform} and process.arch=${arch}. ` +
            "Add an official platform asset before using this environment."
        );
    }

    return {
        ...platformPackage,
        platform,
        arch,
        downloadUrl: `${CHROMAPRINT_DOWNLOAD_ROOT}/${platformPackage.archiveName}`,
    };
};

const getBinaryPath = (binaryName) => path.join(TOOLS_DIRECTORY, binaryName);

const verifyBinary = async (binaryPath) => {
    try {
        const result = await execFileAsync(binaryPath, ["-version"], {
            windowsHide: true,
            timeout: 15_000,
        });
        const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();

        if (!/fpcalc\s+version/i.test(output)) {
            throw new Error(`fpcalc -version returned unexpected output: ${output || "<empty>"}`);
        }

        return output;
    } catch (error) {
        throw new Error(
            `Unable to execute ${binaryPath} -version: ${error?.stderr || error?.message || error}`
        );
    }
};

const downloadFile = async (url, destinationPath) => {
    const response = await fetch(url, {
        headers: { "User-Agent": "reso-unlimited-rhythm-chromaprint-installer" },
        redirect: "follow",
    });

    if (!response.ok) {
        throw new Error(`Chromaprint download failed with HTTP ${response.status} ${response.statusText}.`);
    }

    const data = Buffer.from(await response.arrayBuffer());
    if (data.length === 0) {
        throw new Error("Chromaprint download returned an empty archive.");
    }

    await fs.writeFile(destinationPath, data);
};

const extractArchive = async (archivePath, destinationPath, archiveType) => {
    await fs.mkdir(destinationPath, { recursive: true });

    if (archiveType === "zip") {
        if (process.platform !== "win32") {
            throw new Error("Windows Chromaprint archive cannot be extracted on a non-Windows host.");
        }

        const command = [
            "Expand-Archive",
            "-LiteralPath",
            quotePowerShellLiteral(archivePath),
            "-DestinationPath",
            quotePowerShellLiteral(destinationPath),
            "-Force",
        ].join(" ");

        await execFileAsync("powershell.exe", [
            "-NoLogo",
            "-NoProfile",
            "-NonInteractive",
            "-Command",
            command,
        ], { windowsHide: true });
        return;
    }

    await execFileAsync("tar", ["-xzf", archivePath, "-C", destinationPath]);
};

const findFile = async (directory, fileName) => {
    const entries = await fs.readdir(directory, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isFile() && entry.name.toLowerCase() === fileName.toLowerCase()) {
            return entryPath;
        }

        if (entry.isDirectory()) {
            const nestedMatch = await findFile(entryPath, fileName);
            if (nestedMatch) return nestedMatch;
        }
    }

    return null;
};

const installBinary = async (platformPackage, targetPath) => {
    const temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "reso-chromaprint-"));
    const archivePath = path.join(temporaryDirectory, platformPackage.archiveName);
    const extractionDirectory = path.join(temporaryDirectory, "extracted");

    try {
        console.log(`[chromaprint] Downloading ${platformPackage.archiveName}...`);
        await downloadFile(platformPackage.downloadUrl, archivePath);
        await extractArchive(archivePath, extractionDirectory, platformPackage.archiveType);

        const extractedBinary = await findFile(extractionDirectory, platformPackage.binaryName);
        if (!extractedBinary) {
            throw new Error(`The downloaded archive does not contain ${platformPackage.binaryName}.`);
        }

        await fs.mkdir(TOOLS_DIRECTORY, { recursive: true });
        await fs.rm(targetPath, { force: true });
        await fs.copyFile(extractedBinary, targetPath);

        if (platformPackage.platform !== "win32") {
            await fs.chmod(targetPath, 0o755);
        }
    } finally {
        await fs.rm(temporaryDirectory, { recursive: true, force: true }).catch(() => null);
    }
};

const main = async () => {
    const platformPackage = getPlatformPackage();
    const targetPath = getBinaryPath(platformPackage.binaryName);

    try {
        const version = await verifyBinary(targetPath);
        console.log(`[chromaprint] Reusing ${targetPath}: ${version}`);
        return;
    } catch {
        // The bundled binary is absent or invalid; install it below.
    }

    await installBinary(platformPackage, targetPath);
    const version = await verifyBinary(targetPath);
    console.log(`[chromaprint] Ready: ${version}`);
};

main().catch((error) => {
    console.error("[chromaprint] Automatic fpcalc setup failed.");
    console.error(`[chromaprint] ${error.message}`);
    console.error(
        "[chromaprint] npm install cannot complete safely because fingerprint moderation requires a verified fpcalc binary."
    );
    process.exitCode = 1;
});
