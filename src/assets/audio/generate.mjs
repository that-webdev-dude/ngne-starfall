// Original Starfall synthesis. Re-run with node src/assets/audio/generate.mjs.
// No third-party samples or melodies. PCM exports are consumed through NGNE audioAsset.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const rate = 22050;
let seed = 0x5fa11;
function noise() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2147483648 - 1;
}
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
const output = [];
function buffer(seconds) {
    return new Float64Array(Math.ceil(seconds * rate));
}
function add(data, at, duration, sample, volume = 1) {
    const start = Math.round(at * rate),
        count = Math.round(duration * rate);
    for (let i = 0; i < count; i++) {
        const index = start + i;
        if (index >= data.length) break;
        const t = i / rate;
        data[index] += sample(t, i / count) * volume;
    }
}
function tone(data, at, duration, midi, gain, kind = "lead") {
    const f = hz(midi);
    add(
        data,
        at,
        duration,
        (t, p) => {
            const envelope = Math.min(1, t / 0.006) * Math.min(1, (duration - t) / 0.025);
            const phase = 2 * Math.PI * f * t;
            const wave =
                kind === "bass"
                    ? Math.sin(phase) + 0.27 * Math.sin(phase * 2) + 0.12 * Math.sin(phase * 3)
                    : Math.sin(phase + Math.sin(phase * 2) * 1.8 * Math.exp(-t * 8)) * 0.75 +
                      Math.sin(phase * 1.003) * 0.25;
            return (
                wave *
                envelope *
                (kind === "bass" ? Math.exp(-t * 4) : 0.65 + 0.35 * Math.exp(-t * 10))
            );
        },
        gain,
    );
}
function kick(data, at, gain = 0.55) {
    add(
        data,
        at,
        0.24,
        (t) =>
            Math.sin(2 * Math.PI * (48 * t + 2.7 * (1 - Math.exp(-t * 35)))) * Math.exp(-t * 20) +
            noise() * Math.exp(-t * 180) * 0.2,
        gain,
    );
}
function snare(data, at) {
    let previous = 0;
    add(
        data,
        at,
        0.18,
        (t) => {
            const n = noise();
            const high = n - previous;
            previous = n;
            return (
                high * 0.45 * Math.exp(-t * 23) +
                Math.sin(t * 2 * Math.PI * 170) * Math.exp(-t * 34) * 0.35
            );
        },
        0.28,
    );
}
function hat(data, at, open = false) {
    let previous = 0;
    add(
        data,
        at,
        open ? 0.12 : 0.045,
        (t) => {
            const n = noise();
            const high = n - previous;
            previous = n;
            return high * Math.exp(-t * (open ? 38 : 95));
        },
        open ? 0.055 : 0.04,
    );
}
function music(name, bpm, boss, sector = 0) {
    const beat = 60 / bpm,
        bars = 8,
        data = buffer(beat * 4 * bars);
    const roots =
        sector === 1
            ? [40, 40, 43, 38, 40, 47, 43, 38]
            : sector === 2
              ? [37, 44, 40, 35, 37, 40, 44, 42]
              : boss
                ? [38, 38, 34, 36, 38, 41, 34, 36]
                : [38, 34, 41, 36, 38, 34, 41, 36];
    const melody =
        sector === 1
            ? [0, 7, 0, 10, 12, 7, 15, 10, 0, 3, 7, 0, 10, 12, 7, 3]
            : sector === 2
              ? [12, 19, 15, 14, 10, 7, 14, 15, 19, 22, 19, 15, 14, 10, 7, 10]
              : boss
                ? [0, 0, 7, 10, 12, 10, 7, 5, 0, 3, 7, 10, 7, 5, 3, 5]
                : [12, 7, 10, 14, 12, 7, 5, 7, 12, 15, 14, 10, 7, 10, 5, 7];
    for (let bar = 0; bar < bars; bar++) {
        const root = roots[bar],
            base = bar * 4 * beat;
        for (let step = 0; step < 16; step++) {
            const at = base + (step * beat) / 4;
            if (step % 4 === 0 || (boss && step === 10) || (sector === 1 && step === 7))
                kick(data, at);
            if (step === 4 || step === 12) snare(data, at);
            if (step % 2 === 0 || (boss && sector === 2)) hat(data, at, step === 14);
            tone(data, at, beat * 0.2, root + 24 + [0, 7, 12, 7][step % 4], 0.035, "lead");
            if (step % 2 === 0) {
                tone(
                    data,
                    at,
                    beat * 0.38,
                    root + (step === 6 || step === 14 ? 12 : 0),
                    0.2,
                    "bass",
                );
                const m = melody[(step / 2 + (bar % 2) * 8) % 16];
                tone(data, at, beat * (step === 14 ? 0.7 : 0.42), root + 12 + m, boss ? 0.12 : 0.1);
            }
        }
    }
    save(name, data, 0.88);
}
function save(name, data, peakTarget = 0.85) {
    let peak = 0,
        sum = 0;
    for (const sample of data) peak = Math.max(peak, Math.abs(sample));
    const gain = peak > 0 ? peakTarget / peak : 1;
    const wav = Buffer.alloc(44 + data.length * 2);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(wav.length - 8, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(rate, 24);
    wav.writeUInt32LE(rate * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(data.length * 2, 40);
    for (let i = 0; i < data.length; i++) {
        const s = Math.max(-1, Math.min(1, data[i] * gain));
        sum += s * s;
        wav.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
    }
    writeFileSync(new URL(name + ".wav", import.meta.url), wav);
    output.push({
        name: name + ".wav",
        seconds: data.length / rate,
        rate,
        channels: 1,
        peak: peakTarget,
        rms: Math.sqrt(sum / data.length),
        bytes: wav.length,
    });
}
music("breakwater", 138, false);
music("gatebreaker", 154, true);
let data = buffer(0.105);
add(
    data,
    0,
    0.105,
    (t) =>
        Math.sin(2 * Math.PI * (1700 * t - 5000 * t * t)) * Math.exp(-t * 48) +
        noise() * 0.1 * Math.exp(-t * 70),
);
save("shot", data, 0.66);
data = buffer(0.12);
add(
    data,
    0,
    0.12,
    (t) => noise() * Math.exp(-t * 42) + Math.sin(t * 2 * Math.PI * 640) * Math.exp(-t * 55) * 0.3,
);
save("hit", data, 0.68);
data = buffer(0.65);
add(
    data,
    0,
    0.65,
    (t) =>
        noise() * Math.exp(-t * 9) * 0.7 +
        Math.sin(2 * Math.PI * (42 * t + 1.8 * (1 - Math.exp(-t * 20)))) * Math.exp(-t * 8),
);
save("explosion", data, 0.92);
data = buffer(0.9);
add(
    data,
    0,
    0.9,
    (t) =>
        noise() * Math.exp(-t * 5) * 0.4 +
        Math.sin(2 * Math.PI * (48 * t + 5 * (1 - Math.exp(-t * 12)))) * Math.exp(-t * 5),
);
for (let i = 0; i < 5; i++) tone(data, i * 0.07, 0.32, 62 + i * 5, 0.2);
save("nova", data, 0.9);
data = buffer(0.4);
add(
    data,
    0,
    0.4,
    (t) =>
        Math.sin(2 * Math.PI * (280 * t - 220 * t * t)) * Math.exp(-t * 10) +
        noise() * Math.exp(-t * 16) * 0.35,
);
save("damage", data, 0.8);
data = buffer(1.15);
for (let i = 0; i < 3; i++)
    add(
        data,
        i * 0.35,
        0.2,
        (t) => Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 587.33 * t) * 0.4,
        0.3,
    );
save("warning", data, 0.75);
data = buffer(1.5);
[62, 66, 69, 74].forEach((m, i) => tone(data, i * 0.15, 0.65, m, 0.4));
save("clear", data, 0.82);
data = buffer(1.25);
[50, 48, 45, 38].forEach((m, i) => tone(data, i * 0.18, 0.55, m, 0.4, "bass"));
save("death", data, 0.78);
seed = 0xf012;
music("furnace", 146, false, 1);
music("kiln", 162, true, 1);
seed = 0xc17ade1;
music("citadel", 150, false, 2);
music("starfall-engine", 170, true, 2);
writeFileSync(
    new URL("provenance.json", import.meta.url),
    JSON.stringify(
        {
            source: "Original deterministic synthesis in generate.mjs; no external samples or melody sources.",
            format: "mono PCM16 WAV",
            files: output,
        },
        null,
        2,
    ),
);
console.log(JSON.stringify(output, null, 2));
