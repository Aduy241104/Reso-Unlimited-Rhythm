import ffmpegStatic from "ffmpeg-static";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { AppError } from "../../utils/AppError.js";

const parseDuration = (probeOutput) => {
    const match = String(probeOutput || "").match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
    if (!match) return 0;
    return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
};

const inspectPodcastAudio = async (fileBuffer, fileName = "podcast-audio") => {
    const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "reso-podcast-"));
    const extension = path.extname(String(fileName || "")) || ".bin";
    const filePath = path.join(tempDirectory, `source${extension}`);

    try {
        await fs.writeFile(filePath, fileBuffer);
        const output = await new Promise((resolve, reject) => {
            const process = spawn(ffmpegStatic, ["-hide_banner", "-i", filePath, "-f", "null", "-"], {
                windowsHide: true,
            });
            let stderr = "";
            process.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
            process.on("error", reject);
            process.on("close", (code) => {
                const duration = parseDuration(stderr);
                if (!duration || (code !== 0 && !stderr.includes("Duration:"))) {
                    reject(new AppError("Không thể đọc thời lượng file audio Podcast.", 400, {
                        code: "PODCAST_AUDIO_INVALID",
                        field: "audio",
                    }));
                    return;
                }
                resolve({ duration, stderr });
            });
        });

        return {
            duration: output.duration,
            format: path.extname(String(fileName || "")).slice(1).toLowerCase(),
        };
    } finally {
        await fs.rm(tempDirectory, { recursive: true, force: true }).catch(() => null);
    }
};

export { inspectPodcastAudio };
