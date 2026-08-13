import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import fs from "fs";

const text = process.argv[2];
const outputFile = process.argv[3];
const outputMeta = process.argv[4]; // 可选：词级时间戳元数据文件

if (!text || !outputFile) {
    console.error("Usage: node tts-script.mjs <text> <output-file> [metadata-file]");
    process.exit(1);
}

try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
        "en-US-AriaNeural",
        OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3,
        { wordBoundaryEnabled: true }
    );

    const { audioStream, metadataStream } = tts.toStream(text);
    const writeStream = fs.createWriteStream(outputFile);
    audioStream.pipe(writeStream);

    // 收集 WordBoundary 精确时间戳（Offset/Duration 单位 100ns，转换为秒）
    const boundaries = [];
    metadataStream?.on("data", (chunk) => {
        try {
            const obj = JSON.parse(chunk.toString());
            for (const item of obj.Metadata || []) {
                if (item.Type === "WordBoundary" && item.Data) {
                    // Data.text 可能是字符串或 {Text, Length, BoundaryType} 对象
                    const t = item.Data.text;
                    const word = typeof t === "string" ? t : (t && t.Text) || "";
                    boundaries.push({
                        word: word,
                        offset: item.Data.Offset / 10000000,
                        duration: item.Data.Duration / 10000000,
                    });
                }
            }
        } catch { /* 忽略无法解析的元数据块 */ }
    });

    writeStream.on("finish", () => {
        if (outputMeta) {
            fs.writeFileSync(outputMeta, JSON.stringify(boundaries));
        }
        console.log("OK");
        tts.close();
        process.exit(0);
    });

    writeStream.on("error", (err) => {
        console.error("ERROR:", err.message);
        tts.close();
        process.exit(1);
    });
} catch (err) {
    console.error("ERROR:", err.message);
    process.exit(1);
}
