import { createServer } from "node:http";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import { join, resolve, extname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { object, validate } from "./model.js";
export async function loadAdapter(filename) {
    const path = resolve(filename);
    if (extname(path) !== ".mjs")
        throw Error("Adapter: expected an explicit .mjs file");
    const raw = object((await import(pathToFileURL(path).href)).default, "adapter default export");
    const images = Array.isArray(raw.images)
        ? raw.images.map((image, index) => {
            const item = object(image, `image ${index}`);
            return { ...item, src: item.src instanceof URL ? item.src.href : item.src };
        })
        : raw.images;
    const preview = validate({ ...raw, images });
    for (const image of preview.images) {
        try {
            const url = new URL(image.src);
            if (url.protocol !== "file:" || url.host || url.search || url.hash)
                throw Error("not a local file URL");
            const path = fileURLToPath(url);
            if (!(await stat(path)).isFile())
                throw Error("not a file");
        }
        catch (error) {
            throw Error(`image ${image.id}.src: ${String(error)}`);
        }
    }
    return preview;
}
/** Exact route inventory, never a filesystem root. Bytes are snapshotted at startup. */
export async function startPreview(filename, packageRoot = fileURLToPath(new URL("../../", import.meta.url))) {
    const preview = await loadAdapter(filename);
    const routes = new Map();
    const add = async (route, file, type) => routes.set(route, { bytes: await readFile(file), type });
    for (const name of ["browser.js", "model.js", "playback.js", "inspection.js"])
        await add(`/${name}`, join(packageRoot, "dist/preview", name), "text/javascript");
    await add("/", join(packageRoot, "dist/preview/index.html"), "text/html; charset=utf-8");
    const engine = join(packageRoot, "dist/engine");
    const modules = async (directory, prefix) => {
        for (const entry of await readdir(directory, { withFileTypes: true })) {
            const path = join(directory, entry.name);
            if (entry.isSymbolicLink() || (await realpath(path)) !== path)
                throw Error("Linked engine module");
            if (entry.isDirectory())
                await modules(path, `${prefix}${entry.name}/`);
            else if (entry.name.endsWith(".js"))
                await add(`${prefix}${entry.name}`, path, "text/javascript");
        }
    };
    await modules(engine, "/engine/");
    for (const [index, image] of preview.images.entries()) {
        const route = `/images/${index}`;
        await add(route, fileURLToPath(image.src), "application/octet-stream");
        image.src = route;
    }
    routes.set("/config", {
        bytes: Buffer.from(JSON.stringify(preview)),
        type: "application/json",
    });
    const server = createServer((request, response) => {
        const host = `127.0.0.1:${port}`;
        if (request.headers.host !== host ||
            (request.headers.origin && request.headers.origin !== `http://${host}`)) {
            response.writeHead(403).end("Forbidden");
            return;
        }
        if (request.method !== "GET" && request.method !== "HEAD") {
            response.writeHead(405).end();
            return;
        }
        const route = routes.get(request.url ?? "");
        if (!route) {
            response.writeHead(404).end("Not found");
            return;
        }
        response.writeHead(200, {
            "Content-Type": route.type,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        });
        response.end(request.method === "HEAD" ? undefined : route.bytes);
    });
    let port = 0;
    await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string")
        throw Error("Missing loopback server address");
    port = address.port;
    return {
        url: `http://127.0.0.1:${port}/`,
        close: () => new Promise((resolve, reject) => {
            server.close((error) => (error ? reject(error) : resolve()));
            server.closeAllConnections();
        }),
    };
}
