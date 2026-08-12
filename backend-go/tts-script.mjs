import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import fs from "fs";

const text = process.argv[2];
const outputFile = process.argv[3];

if (!text || !outputFile) {
    console.error("Usage: node tts-script.mjs <text> <output-file>");
    process.exit(1);
}

try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata("en-US-AriaNeural", OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(text);
    const writeStream = fs.createWriteStream(outputFile);

    audioStream.pipe(writeStream);

    writeStream.on("finish", () => {
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
