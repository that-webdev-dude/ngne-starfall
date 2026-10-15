#!/usr/bin/env node
import { startPreview } from "./host.js";
try {
    if (process.argv.length !== 3)
        throw Error("Usage: ngne-preview ./preview.config.mjs");
    const server = await startPreview(process.argv[2]);
    console.log(`NGNE preview: ${server.url}`);
    let closing = false;
    const close = () => {
        if (closing)
            return;
        closing = true;
        void server.close().catch((error) => {
            console.error(error);
            process.exitCode = 1;
        });
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
}
catch (error) {
    console.error(`NGNE preview failed: ${String(error)}`);
    process.exitCode = 1;
}
