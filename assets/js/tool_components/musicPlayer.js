// Standalone Floating Music Player (Desktop-only, modular & isolated from core graphing)
// Routes audio through window.mireAudioBridge so playback shares MIRElink's PEQ, Auto-Gain,
// Channel Balance, and real-time FFT spectrum without affecting core app state.

(function initMireMusicPlayerModule() {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    if (typeof extraEnabled !== "undefined" && !extraEnabled) return;
    if (typeof extraEQEnabled !== "undefined" && !extraEQEnabled) return;

    const STORAGE_KEY = "mirelink_music_player_state_v1";
    const IDB_NAME = "mirelink_music_library_v1";
    const IDB_VERSION = 1;
    const META_VERSION = 3;
    const MOBILE_QUERY = "(max-width: 1000px)";
    const SUPPORTS_FS_HANDLES = typeof window.showOpenFilePicker === "function";
    const SUPPORTS_IDB = typeof indexedDB !== "undefined";

    const AUDIO_EXTENSIONS = new Set([
        "mp3", "flac", "wav", "ogg", "opus", "m4a", "aac", "alac", "aiff", "aif", "webm", "wma"
    ]);

    const SVG = {
        note: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
        artFallback: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>',
        play: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 4l14 8-14 8V4z"/></svg>',
        pause: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>',
        miniPlay: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 3l14 9-14 9V3z"/></svg>',
        miniPause: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>',
        prev: '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z"/></svg>',
        next: '<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 6h2v12h-2V6zm-1.5 6L6 6v12l8.5-6z"/></svg>',
        shuffle: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/></svg>',
        repeat: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
        repeatOne: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/></svg>',
        volume: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 7l8-5v20l-8-5v-10zm-6 10h4v-10h-4v10zm18.5-5c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>',
        muted: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
        gear: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
        minimize: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 18h14v2H5z"/></svg>',
        expand: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 4h16v16H4V4zm2 4v10h12V8H6z"/></svg>',
        close: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.3 5.71L12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.3l6.3 6.29 6.29-6.3z"/></svg>'
    };

    const COLUMN_DEFS = {
        trackNo:          { key: "trackNo",          label: "#",                    defaultVisible: true,  lockVisible: false, defaultWidth: 42,   minWidth: 34 },
        title:            { key: "title",            label: "Title",                defaultVisible: true,  lockVisible: false, defaultWidth: null, minWidth: 80 },
        titleArtist:      { key: "titleArtist",      label: "Title / Artist",       defaultVisible: false, lockVisible: false, defaultWidth: 210,  minWidth: 90 },
        artist:           { key: "artist",           label: "Artist",               defaultVisible: true,  lockVisible: false, defaultWidth: 135,  minWidth: 56 },
        albumArtist:      { key: "albumArtist",      label: "Album Artist",         defaultVisible: false, lockVisible: false, defaultWidth: 135,  minWidth: 64 },
        album:            { key: "album",            label: "Album",                defaultVisible: true,  lockVisible: false, defaultWidth: 135,  minWidth: 56 },
        artistAlbum:      { key: "artistAlbum",      label: "Artist / Album",       defaultVisible: false, lockVisible: false, defaultWidth: 205,  minWidth: 90 },
        albumArtistAlbum: { key: "albumArtistAlbum", label: "Album Artist / Album", defaultVisible: false, lockVisible: false, defaultWidth: 215,  minWidth: 90 },
        codec:            { key: "codec",            label: "Codec",                defaultVisible: true,  lockVisible: false, defaultWidth: 62,   minWidth: 46 },
        bitrate:          { key: "bitrate",          label: "Bitrate",              defaultVisible: false, lockVisible: false, defaultWidth: 76,   minWidth: 54 },
        duration:         { key: "duration",         label: "Duration",             defaultVisible: true,  lockVisible: false, defaultWidth: 66,   minWidth: 52 }
    };

    const DEFAULT_COLUMN_ORDER = [
        "trackNo", "title", "titleArtist", "artist", "albumArtist",
        "album", "artistAlbum", "albumArtistAlbum", "codec", "bitrate", "duration"
    ];

    function defaultState() {
        const vw = Math.max(window.innerWidth || 1280, 900);
        const vh = Math.max(window.innerHeight || 800, 640);
        const width = Math.min(760, vw - 40);
        const height = Math.min(480, vh - 80);
        return {
            mode: "closed",
            x: Math.max(24, Math.round(vw - width - 28)),
            y: Math.max(24, Math.round(vh - height - 28)),
            width,
            height,
            miniWidth: 400,
            activePlaylistId: "all",
            sortBy: "addedAt",
            sortDir: "asc",
            shuffle: false,
            repeat: "off",
            columns: {
                trackNo: true,
                title: true,
                titleArtist: false,
                artist: true,
                albumArtist: false,
                album: true,
                artistAlbum: false,
                albumArtistAlbum: false,
                codec: true,
                bitrate: false,
                duration: true
            },
            columnOrder: DEFAULT_COLUMN_ORDER.slice(),
            columnWidths: {}
        };
    }

    function loadPersistedState() {
        const base = defaultState();
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return base;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") return base;

            const mergedCols = { ...base.columns, ...(parsed.columns || {}) };
            if (parsed.columns && typeof parsed.columns.time === "boolean" && typeof parsed.columns.duration !== "boolean") {
                mergedCols.duration = parsed.columns.time;
            }
            if (!Object.keys(COLUMN_DEFS).some(k => mergedCols[k])) {
                mergedCols.title = true;
            }

            let order = Array.isArray(parsed.columnOrder) ? parsed.columnOrder.filter(k => COLUMN_DEFS[k]) : [];
            DEFAULT_COLUMN_ORDER.forEach((k) => {
                if (!order.includes(k)) order.push(k);
            });

            return {
                ...base,
                ...parsed,
                columns: mergedCols,
                columnOrder: order,
                columnWidths: parsed.columnWidths && typeof parsed.columnWidths === "object" ? parsed.columnWidths : {}
            };
        } catch (_) {
            return base;
        }
    }

    let state = loadPersistedState();
    let tracks = [];
    let playlists = [];
    let folderHandles = [];
    const sessionFiles = new Map();
    let searchQuery = "";
    let currentTrackId = null;
    let isPlaying = false;
    let currentObjectUrl = null;
    let currentCoverUrl = null;
    let needsPermissionReconnect = false;
    let shuffleHistory = [];

    let playerAudio = null;
    let playerSource = null;
    let isSeeking = false;
    let unsubVolume = null;

    let rootEl = null;
    let dom = null;
    let mounted = false;
    let dbPromise = null;
    let inlinePlaylistDraft = null;
    let isRefreshingMeta = false;

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (_) {}
    }

    function isDesktop() {
        return !(window.matchMedia && window.matchMedia(MOBILE_QUERY).matches);
    }

    function notify(msg) {
        if (typeof showGraphNotice === "function") {
            showGraphNotice(msg);
        }
    }

    function escapeHtml(str) {
        return String(str == null ? "" : str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatClock(sec) {
        if (!isFinite(sec) || sec <= 0) return "--:--";
        const total = Math.floor(sec);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
        const ss = String(s).padStart(2, "0");
        return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
    }

    function formatElapsed(sec) {
        if (!isFinite(sec) || sec < 0) sec = 0;
        const total = Math.floor(sec);
        const h = Math.floor(total / 3600);
        const m = Math.floor((total % 3600) / 60);
        const s = total % 60;
        return h > 0
            ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
            : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }

    function isAudioFilename(name) {
        if (!name) return false;
        const dot = name.lastIndexOf(".");
        if (dot < 0) return false;
        return AUDIO_EXTENSIONS.has(name.slice(dot + 1).toLowerCase());
    }

    function inferCodecFromExt(name) {
        if (!name) return "";
        const dot = name.lastIndexOf(".");
        if (dot < 0) return "";
        const ext = name.slice(dot + 1).toUpperCase();
        if (ext === "M4A") return "AAC";
        return ext;
    }

    function parseFilenameFallback(filename) {
        const clean = String(filename || "Unknown Track").replace(/\.[^/.]+$/, "").trim();
        const trackMatch = clean.match(/^(\d{1,3})\s*[.\-_)\]]\s*(.+)$/);
        let trackNo = null;
        let rest = clean;
        if (trackMatch) {
            trackNo = parseInt(trackMatch[1], 10);
            rest = trackMatch[2].trim();
        }
        const parts = rest.split(/\s+-\s+/);
        if (parts.length >= 2) {
            return {
                trackNo,
                artist: parts[0].trim() || "",
                title: parts.slice(1).join(" - ").trim() || rest
            };
        }
        return {
            trackNo,
            artist: "",
            title: rest || clean
        };
    }

    // ---------- Smart Text & Unsynchronization Decoders ----------
    function decodeUnsyncBytes(bytes) {
        const out = [];
        for (let i = 0; i < bytes.length; i++) {
            out.push(bytes[i]);
            if (bytes[i] === 0xff && i + 1 < bytes.length && bytes[i + 1] === 0x00) {
                i++;
            }
        }
        return new Uint8Array(out);
    }

    function decodeBytes(bytes, encodingByte) {
        if (!bytes || !bytes.length) return "";
        try {
            if (encodingByte === 1 || encodingByte === 2) {
                let isLE = encodingByte === 1;
                let offset = 0;
                if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
                    isLE = true;
                    offset = 2;
                } else if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
                    isLE = false;
                    offset = 2;
                } else if (encodingByte === 2) {
                    isLE = false;
                } else if (bytes.length >= 4 && bytes[0] === 0x00 && bytes[1] !== 0x00 && bytes[2] === 0x00) {
                    isLE = false;
                }
                let end = bytes.length;
                for (let i = offset; i + 1 < end; i += 2) {
                    if (bytes[i] === 0 && bytes[i + 1] === 0) {
                        end = i;
                        break;
                    }
                }
                const dec = new TextDecoder(isLE ? "utf-16le" : "utf-16be");
                return dec.decode(bytes.subarray(offset, end)).replace(/\0+$/g, "").trim();
            }

            // Trim at first null byte
            let end = bytes.indexOf(0);
            const slice = end >= 0 ? bytes.subarray(0, end) : bytes;
            if (!slice.length) return "";

            if (encodingByte === 3) {
                return new TextDecoder("utf-8").decode(slice).trim();
            }

            // encodingByte === 0 (ISO-8859-1): check pure ASCII, then valid multi-byte UTF-8,
            // then Shift-JIS (common in Japanese OST MP3s), then Windows-1252.
            let hasHigh = false;
            for (let i = 0; i < slice.length; i++) {
                if (slice[i] >= 0x80) {
                    hasHigh = true;
                    break;
                }
            }
            if (!hasHigh) {
                return new TextDecoder("latin1").decode(slice).trim();
            }

            try {
                const utf8Txt = new TextDecoder("utf-8", { fatal: true }).decode(slice).trim();
                if (utf8Txt) return utf8Txt;
            } catch (_) {}

            try {
                const sjisTxt = new TextDecoder("shift_jis", { fatal: true }).decode(slice).trim();
                if (sjisTxt && /[\u3000-\u30FF\u3400-\u9FFF\uFF01-\uFF9F]/.test(sjisTxt)) {
                    return sjisTxt;
                }
            } catch (_) {}

            return new TextDecoder("windows-1252").decode(slice).trim();
        } catch (_) {
            return "";
        }
    }

    function readSynchsafe(view, off) {
        return ((view.getUint8(off) & 0x7f) << 21) |
               ((view.getUint8(off + 1) & 0x7f) << 14) |
               ((view.getUint8(off + 2) & 0x7f) << 7) |
               (view.getUint8(off + 3) & 0x7f);
    }

    function parseTrackInt(raw) {
        if (!raw) return null;
        const m = String(raw).match(/\d+/);
        if (!m) return null;
        const n = parseInt(m[0], 10);
        return isFinite(n) && n > 0 ? n : null;
    }

    // ---------- MPEG / Xing / VBRI Frame Analysis ----------
    function parseMpegAudioInfo(bytes, audioStartOffset, fileSize) {
        const bitrateV1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
        const bitrateV1L2 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0];
        const bitrateV1L1 = [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0];
        const bitrateV2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
        const bitrateV2L1 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0];
        const srTable = {
            3: [44100, 48000, 32000],
            2: [22050, 24000, 16000],
            0: [11025, 12000, 8000]
        };

        for (let i = 0; i < bytes.length - 4; i++) {
            if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;
            const verBits = (bytes[i + 1] >> 3) & 0x03;
            const layerBits = (bytes[i + 1] >> 1) & 0x03;
            const brIdx = (bytes[i + 2] >> 4) & 0x0f;
            const srIdx = (bytes[i + 2] >> 2) & 0x03;
            const chanMode = (bytes[i + 3] >> 6) & 0x03;

            if (verBits === 1 || layerBits === 0 || brIdx === 0 || brIdx === 15 || srIdx === 3) continue;

            const sr = srTable[verBits]?.[srIdx];
            if (!sr) continue;

            let codec = "MP3";
            let table = bitrateV1L3;
            if (layerBits === 3) {
                codec = "MP1";
                table = verBits === 3 ? bitrateV1L1 : bitrateV2L1;
            } else if (layerBits === 2) {
                codec = "MP2";
                table = verBits === 3 ? bitrateV1L2 : bitrateV2L3;
            } else {
                codec = "MP3";
                table = verBits === 3 ? bitrateV1L3 : bitrateV2L3;
            }

            const frameBitrate = table[brIdx];
            if (!frameBitrate) continue;

            const samplesPerFrame = layerBits === 3 ? 384 : (layerBits === 2 || verBits === 3 ? 1152 : 576);
            const audioBytes = Math.max(0, fileSize - audioStartOffset);
            const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

            // Check Xing / Info VBR header
            const sideInfoSize = verBits === 3 ? (chanMode === 3 ? 17 : 32) : (chanMode === 3 ? 9 : 17);
            const xingPos = i + 4 + sideInfoSize;
            if (xingPos + 12 <= bytes.length) {
                const tag = String.fromCharCode(bytes[xingPos], bytes[xingPos + 1], bytes[xingPos + 2], bytes[xingPos + 3]);
                if (tag === "Xing" || tag === "Info") {
                    const flags = view.getUint32(xingPos + 4, false);
                    if (flags & 0x01) {
                        const frames = view.getUint32(xingPos + 8, false);
                        if (frames > 0) {
                            const duration = (frames * samplesPerFrame) / sr;
                            const byteLen = (flags & 0x02) && xingPos + 16 <= bytes.length
                                ? view.getUint32(xingPos + 12, false)
                                : audioBytes;
                            const avgBitrate = duration > 0 ? Math.round((byteLen * 8) / duration / 1000) : frameBitrate;
                            return { codec, bitrate: avgBitrate, duration };
                        }
                    }
                }
            }

            // Check VBRI header
            const vbriPos = i + 4 + 32;
            if (vbriPos + 18 <= bytes.length &&
                String.fromCharCode(bytes[vbriPos], bytes[vbriPos + 1], bytes[vbriPos + 2], bytes[vbriPos + 3]) === "VBRI") {
                const byteLen = view.getUint32(vbriPos + 10, false);
                const frames = view.getUint32(vbriPos + 14, false);
                if (frames > 0) {
                    const duration = (frames * samplesPerFrame) / sr;
                    const avgBitrate = duration > 0 ? Math.round(((byteLen || audioBytes) * 8) / duration / 1000) : frameBitrate;
                    return { codec, bitrate: avgBitrate, duration };
                }
            }

            // CBR fallback using frame bitrate
            const duration = frameBitrate > 0 ? (audioBytes * 8) / (frameBitrate * 1000) : null;
            return { codec, bitrate: frameBitrate, duration };
        }
        return {};
    }

    function isLikelyId3v24FrameId(b) {
        if (!b || b.length < 4) return false;
        if (b[0] === 0 && b[1] === 0 && b[2] === 0 && b[3] === 0) return true;
        for (let i = 0; i < 4; i++) {
            const c = b[i];
            if (!((c >= 0x41 && c <= 0x5A) || (c >= 0x30 && c <= 0x39))) return false;
        }
        return true;
    }

    // ---------- Dynamic File Header Parsers (Skip Picture Bytes During Scan) ----------
    async function parseID3v2Dynamic(blobOrFile, extractArt = false, baseOffset = 0) {
        const meta = {};
        if (baseOffset + 10 > blobOrFile.size) return meta;
        const hdrBuf = await blobOrFile.slice(baseOffset, baseOffset + 10).arrayBuffer();
        const hdrBytes = new Uint8Array(hdrBuf);
        if (hdrBytes[0] !== 0x49 || hdrBytes[1] !== 0x44 || hdrBytes[2] !== 0x33) return meta;

        const hdrView = new DataView(hdrBuf);
        const ver = hdrBytes[3];
        const tagFlags = hdrBytes[5];
        const tagSize = readSynchsafe(hdrView, 6);
        const tagEnd = Math.min(blobOrFile.size, baseOffset + 10 + tagSize);
        meta._audioStart = tagEnd;

        let pos = baseOffset + 10;
        const hdrLen = ver === 2 ? 6 : 10;

        // Read extended header size if present
        if ((tagFlags & 0x40) && pos + 4 <= tagEnd) {
            const extBuf = await blobOrFile.slice(pos, pos + 4).arrayBuffer();
            const extView = new DataView(extBuf);
            if (ver === 4) {
                pos += Math.max(4, readSynchsafe(extView, 0));
            } else {
                pos += 4 + extView.getUint32(0, false);
            }
        }

        const WANT_TEXT_FRAMES = new Set(["TIT2", "TT2", "TPE1", "TP1", "TPE2", "TP2", "TALB", "TAL", "TRCK", "TRK"]);

        while (pos + hdrLen <= tagEnd) {
            const fHdrBuf = await blobOrFile.slice(pos, pos + hdrLen).arrayBuffer();
            const fBytes = new Uint8Array(fHdrBuf);
            if (fBytes[0] === 0) break;

            const fView = new DataView(fHdrBuf);
            let frameId = "";
            let frameSize = 0;
            let frameFlags = 0;

            if (ver === 2) {
                frameId = String.fromCharCode(fBytes[0], fBytes[1], fBytes[2]);
                frameSize = (fBytes[3] << 16) | (fBytes[4] << 8) | fBytes[5];
            } else {
                frameId = String.fromCharCode(fBytes[0], fBytes[1], fBytes[2], fBytes[3]);
                frameSize = ver === 4 ? readSynchsafe(fView, 4) : fView.getUint32(4, false);
                frameFlags = fView.getUint16(8, false);

                // Workaround for common taggers (iTunes/Windows/older TagLib) writing non-synchsafe uint32 in ID3v2.4
                if (ver === 4) {
                    const rawU32 = fView.getUint32(4, false);
                    if (rawU32 !== frameSize) {
                        const synchInvalid = pos + hdrLen + frameSize > tagEnd;
                        let useRaw = false;
                        if (synchInvalid && pos + hdrLen + rawU32 <= tagEnd) {
                            useRaw = true;
                        } else if (!synchInvalid && pos + hdrLen + rawU32 <= tagEnd) {
                            const nextAtSynch = pos + hdrLen + frameSize;
                            const nextAtRaw = pos + hdrLen + rawU32;
                            const synchPeek = nextAtSynch + 4 <= tagEnd ? new Uint8Array(await blobOrFile.slice(nextAtSynch, nextAtSynch + 4).arrayBuffer()) : null;
                            const rawPeek = nextAtRaw + 4 <= tagEnd ? new Uint8Array(await blobOrFile.slice(nextAtRaw, nextAtRaw + 4).arrayBuffer()) : null;
                            if (synchPeek && !isLikelyId3v24FrameId(synchPeek) && (!rawPeek || isLikelyId3v24FrameId(rawPeek))) {
                                useRaw = true;
                            }
                        }
                        if (useRaw) frameSize = rawU32;
                    }
                }
            }

            if (!frameSize || frameSize < 0 || pos + hdrLen + frameSize > tagEnd) break;

            const isEncrypted = ver === 3 ? (frameFlags & 0x0040) : (ver === 4 ? (frameFlags & 0x0004) : 0);
            const isCompressed = ver === 3 ? (frameFlags & 0x0080) : (ver === 4 ? (frameFlags & 0x0008) : 0);

            if (!isEncrypted && !isCompressed && WANT_TEXT_FRAMES.has(frameId) && !extractArt) {
                const payloadBuf = await blobOrFile.slice(pos + hdrLen, pos + hdrLen + Math.min(frameSize, 65536)).arrayBuffer();
                let payload = new Uint8Array(payloadBuf);
                if ((tagFlags & 0x80) || (ver === 4 && (frameFlags & 0x0002))) {
                    payload = decodeUnsyncBytes(payload);
                }
                let pOff = 0;
                if (ver === 3 && (frameFlags & 0x0020)) pOff += 1; // Grouping identity
                if (ver === 4 && (frameFlags & 0x0040)) pOff += 1; // Grouping identity
                if (ver === 4 && (frameFlags & 0x0001)) pOff += 4; // Data Length Indicator

                if (payload.length > pOff + 1) {
                    const text = decodeBytes(payload.subarray(pOff + 1), payload[pOff]);
                    if (text) {
                        if (frameId === "TIT2" || frameId === "TT2") meta.title = text;
                        else if (frameId === "TPE1" || frameId === "TP1") meta.artist = text;
                        else if (frameId === "TPE2" || frameId === "TP2") meta.albumArtist = text;
                        else if (frameId === "TALB" || frameId === "TAL") meta.album = text;
                        else if (frameId === "TRCK" || frameId === "TRK") meta.trackNo = parseTrackInt(text);
                    }
                }
            } else if (!isEncrypted && !isCompressed && extractArt && (frameId === "APIC" || frameId === "PIC")) {
                const picBuf = await blobOrFile.slice(pos + hdrLen, pos + hdrLen + Math.min(frameSize, 8 * 1024 * 1024)).arrayBuffer();
                let payload = new Uint8Array(picBuf);
                if ((tagFlags & 0x80) || (ver === 4 && (frameFlags & 0x0002))) {
                    payload = decodeUnsyncBytes(payload);
                }
                let pOff = 0;
                if (ver === 3 && (frameFlags & 0x0020)) pOff += 1;
                if (ver === 4 && (frameFlags & 0x0040)) pOff += 1;
                if (ver === 4 && (frameFlags & 0x0001)) pOff += 4;
                const blob = parseId3PicturePayload(pOff ? payload.subarray(pOff) : payload, frameId === "PIC");
                if (blob) {
                    meta.coverBlob = blob;
                    return meta;
                }
            }

            pos += hdrLen + frameSize;
        }
        return meta;
    }

    function parseId3PicturePayload(bytes, isV22) {
        if (!bytes || bytes.length < 6) return null;
        const enc = bytes[0];
        let p = 1;
        let mime = "image/jpeg";

        if (isV22) {
            if (p + 3 > bytes.length) return null;
            const fmt = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2]).toUpperCase();
            mime = fmt === "PNG" ? "image/png" : "image/jpeg";
            p += 3;
        } else {
            const zero = bytes.indexOf(0, p);
            if (zero < 0) return null;
            mime = new TextDecoder("latin1").decode(bytes.subarray(p, zero)).trim() || "image/jpeg";
            p = zero + 1;
        }

        if (p >= bytes.length) return null;
        p += 1; // picture type byte

        // Skip null-terminated description string
        if (enc === 1 || enc === 2) {
            while (p + 1 < bytes.length && !(bytes[p] === 0 && bytes[p + 1] === 0)) p += 2;
            p += 2;
        } else {
            const descZero = bytes.indexOf(0, p);
            p = descZero >= 0 ? descZero + 1 : bytes.length;
        }

        if (p >= bytes.length) return null;
        if (!mime.startsWith("image/")) mime = "image/jpeg";
        return new Blob([bytes.subarray(p)], { type: mime });
    }

    async function parseID3v1(file) {
        const meta = {};
        if (file.size < 128) return meta;
        const buf = await file.slice(file.size - 128, file.size).arrayBuffer();
        const bytes = new Uint8Array(buf);
        if (bytes[0] !== 0x54 || bytes[1] !== 0x41 || bytes[2] !== 0x47) return meta;
        meta.title = decodeBytes(bytes.subarray(3, 33), 0);
        meta.artist = decodeBytes(bytes.subarray(33, 63), 0);
        meta.album = decodeBytes(bytes.subarray(63, 93), 0);
        if (bytes[125] === 0 && bytes[126] > 0) meta.trackNo = bytes[126];
        return meta;
    }

    function applyVorbisComment(meta, key, val) {
        const k = key.toUpperCase();
        if (k === "TITLE" && !meta.title) meta.title = val;
        else if (k === "ARTIST" && !meta.artist) meta.artist = val;
        else if ((k === "ALBUMARTIST" || k === "ALBUM ARTIST" || k === "ALBUM_ARTIST") && !meta.albumArtist) meta.albumArtist = val;
        else if (k === "ALBUM" && !meta.album) meta.album = val;
        else if ((k === "TRACKNUMBER" || k === "TRACK") && !meta.trackNo) meta.trackNo = parseTrackInt(val);
    }

    function parseVorbisCommentBlock(bytes, startOff, maxLen, meta, extractPicB64 = false) {
        if (startOff + 8 > maxLen) return;
        const view = new DataView(bytes.buffer, bytes.byteOffset, maxLen);
        const utf8 = new TextDecoder("utf-8");
        let p = startOff;
        const vendorLen = view.getUint32(p, true);
        p += 4 + vendorLen;
        if (p + 4 > maxLen) return;
        const count = view.getUint32(p, true);
        p += 4;
        for (let i = 0; i < count && p + 4 <= maxLen; i++) {
            const len = view.getUint32(p, true);
            p += 4;
            if (p + len > maxLen) break;
            const entry = utf8.decode(bytes.subarray(p, p + len));
            const eq = entry.indexOf("=");
            if (eq > 0) {
                const k = entry.slice(0, eq).toUpperCase();
                const v = entry.slice(eq + 1).trim();
                if (extractPicB64 && k === "METADATA_BLOCK_PICTURE" && !meta.coverBlob) {
                    try {
                        const binStr = atob(v);
                        const picBytes = new Uint8Array(binStr.length);
                        for (let j = 0; j < binStr.length; j++) picBytes[j] = binStr.charCodeAt(j);
                        meta.coverBlob = parseFlacPictureBlock(picBytes);
                    } catch (_) {}
                } else if (k !== "METADATA_BLOCK_PICTURE") {
                    applyVorbisComment(meta, k, v);
                }
            }
            p += len;
        }
    }

    function parseFlacPictureBlock(bytes) {
        if (!bytes || bytes.length < 32) return null;
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        const utf8 = new TextDecoder("utf-8");
        let p = 4; // skip picture type
        const mimeLen = view.getUint32(p, false);
        p += 4;
        if (p + mimeLen + 4 > bytes.length) return null;
        const mime = utf8.decode(bytes.subarray(p, p + mimeLen)) || "image/jpeg";
        p += mimeLen;
        const descLen = view.getUint32(p, false);
        p += 4 + descLen + 16; // skip desc, w, h, depth, indexed colors
        if (p + 4 > bytes.length) return null;
        const dataLen = view.getUint32(p, false);
        p += 4;
        if (!dataLen || p + dataLen > bytes.length) return null;
        return new Blob([bytes.subarray(p, p + dataLen)], { type: mime.startsWith("image/") ? mime : "image/jpeg" });
    }

    async function parseFlacDynamic(file, extractArt = false, streamOffset = 0) {
        const meta = { codec: "FLAC" };
        let pos = streamOffset + 4;
        while (pos + 4 <= file.size) {
            const bHdrBuf = await file.slice(pos, pos + 4).arrayBuffer();
            const bHdr = new Uint8Array(bHdrBuf);
            const isLast = (bHdr[0] & 0x80) !== 0;
            const type = bHdr[0] & 0x7f;
            const len = (bHdr[1] << 16) | (bHdr[2] << 8) | bHdr[3];
            pos += 4;
            if (pos + len > file.size) break;

            if (!extractArt && type === 0 && len >= 18) {
                const siBuf = await file.slice(pos, pos + Math.min(len, 34)).arrayBuffer();
                const si = new Uint8Array(siBuf);
                const sr = (si[10] << 12) | (si[11] << 4) | (si[12] >> 4);
                const samples = ((si[13] & 0x0f) * 4294967296) +
                    ((si[14] << 24) >>> 0) + (si[15] << 16) + (si[16] << 8) + si[17];
                if (sr > 0 && samples > 0) meta.duration = samples / sr;
            } else if (!extractArt && type === 4) {
                const vcBuf = await file.slice(pos, pos + Math.min(len, 2 * 1024 * 1024)).arrayBuffer();
                const vcBytes = new Uint8Array(vcBuf);
                parseVorbisCommentBlock(vcBytes, 0, vcBytes.length, meta, false);
            } else if (extractArt && type === 6) {
                const picBuf = await file.slice(pos, pos + Math.min(len, 8 * 1024 * 1024)).arrayBuffer();
                const blob = parseFlacPictureBlock(new Uint8Array(picBuf));
                if (blob) {
                    meta.coverBlob = blob;
                    return meta;
                }
            }

            pos += len;
            if (isLast) break;
        }
        if (!extractArt && meta.duration > 0) {
            const audioBytes = Math.max(0, file.size - pos);
            meta.bitrate = Math.round((audioBytes * 8) / meta.duration / 1000);
        }
        return meta;
    }

    async function parseOggDynamic(file, extractArt = false) {
        const meta = {};
        const headSize = Math.min(file.size, extractArt ? 2 * 1024 * 1024 : 524288);
        const headBuf = await file.slice(0, headSize).arrayBuffer();
        const bytes = new Uint8Array(headBuf);
        const view = new DataView(headBuf);

        let sampleRate = 0;
        for (let i = 0; i < bytes.length - 16; i++) {
            if (bytes[i] === 0x01 && String.fromCharCode(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4], bytes[i + 5], bytes[i + 6]) === "vorbis") {
                meta.codec = "Vorbis";
                if (i + 16 <= bytes.length) sampleRate = view.getUint32(i + 12, true);
            } else if (String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]) === "OpusHead") {
                meta.codec = "Opus";
                sampleRate = 48000;
            } else if (bytes[i] === 0x03 && String.fromCharCode(bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4], bytes[i + 5], bytes[i + 6]) === "vorbis") {
                parseVorbisCommentBlock(bytes, i + 7, bytes.length, meta, extractArt);
                if (extractArt && meta.coverBlob) return meta;
            } else if (String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3], bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]) === "OpusTags") {
                parseVorbisCommentBlock(bytes, i + 8, bytes.length, meta, extractArt);
                if (extractArt && meta.coverBlob) return meta;
            }
        }

        if (!extractArt && sampleRate > 0) {
            const tailLen = Math.min(file.size, 32768);
            const tailBuf = await file.slice(file.size - tailLen, file.size).arrayBuffer();
            const tBytes = new Uint8Array(tailBuf);
            const tView = new DataView(tailBuf);
            for (let j = tBytes.length - 27; j >= 0; j--) {
                if (tBytes[j] === 0x4f && tBytes[j + 1] === 0x67 && tBytes[j + 2] === 0x67 && tBytes[j + 3] === 0x53) {
                    const lo = tView.getUint32(j + 6, true);
                    const hi = tView.getInt32(j + 10, true);
                    if (hi >= 0) {
                        const granule = hi * 4294967296 + lo;
                        if (granule > 0) {
                            meta.duration = granule / sampleRate;
                            meta.bitrate = Math.round((file.size * 8) / meta.duration / 1000);
                            break;
                        }
                    }
                }
            }
        }
        return meta;
    }

    async function parseWavDynamic(file, extractArt = false) {
        const meta = { codec: "WAV" };
        if (file.size < 44) return meta;
        const hdrBuf = await file.slice(0, 12).arrayBuffer();
        const hdrBytes = new Uint8Array(hdrBuf);
        if (String.fromCharCode(hdrBytes[0], hdrBytes[1], hdrBytes[2], hdrBytes[3]) !== "RIFF") return meta;

        let pos = 12;
        let byteRate = 0;
        let dataSize = 0;
        while (pos + 8 <= file.size) {
            const cHdrBuf = await file.slice(pos, pos + 8).arrayBuffer();
            const cView = new DataView(cHdrBuf);
            const cBytes = new Uint8Array(cHdrBuf);
            const id = String.fromCharCode(cBytes[0], cBytes[1], cBytes[2], cBytes[3]);
            const sz = cView.getUint32(4, true);
            const bodyStart = pos + 8;
            if (bodyStart > file.size) break;

            if (!extractArt && id === "fmt " && sz >= 16) {
                const fmtBuf = await file.slice(bodyStart, Math.min(file.size, bodyStart + 16)).arrayBuffer();
                byteRate = new DataView(fmtBuf).getUint32(8, true);
                if (byteRate > 0) meta.bitrate = Math.round((byteRate * 8) / 1000);
            } else if (!extractArt && id === "data") {
                dataSize = sz || Math.max(0, file.size - bodyStart);
            } else if (!extractArt && id === "LIST" && sz >= 4 && sz <= 262144) {
                const listBuf = await file.slice(bodyStart, Math.min(file.size, bodyStart + sz)).arrayBuffer();
                const lBytes = new Uint8Array(listBuf);
                const lView = new DataView(listBuf);
                if (String.fromCharCode(lBytes[0], lBytes[1], lBytes[2], lBytes[3]) === "INFO") {
                    let q = 4;
                    while (q + 8 <= lBytes.length) {
                        const subId = String.fromCharCode(lBytes[q], lBytes[q + 1], lBytes[q + 2], lBytes[q + 3]);
                        const subSz = lView.getUint32(q + 4, true);
                        const valEnd = Math.min(lBytes.length, q + 8 + subSz);
                        const txt = decodeBytes(lBytes.subarray(q + 8, valEnd), 0);
                        if (txt) {
                            if (subId === "INAM" && !meta.title) meta.title = txt;
                            else if (subId === "IART" && !meta.artist) meta.artist = txt;
                            else if (subId === "IPRD" && !meta.album) meta.album = txt;
                            else if (subId === "ITRK" && !meta.trackNo) meta.trackNo = parseTrackInt(txt);
                        }
                        q += 8 + subSz + (subSz % 2);
                    }
                }
            } else if ((id === "id3 " || id === "ID3 ") && sz >= 10 && bodyStart + sz <= file.size) {
                const id3Meta = await parseID3v2Dynamic(file, extractArt, bodyStart);
                if (extractArt && id3Meta.coverBlob) {
                    meta.coverBlob = id3Meta.coverBlob;
                    return meta;
                }
                if (id3Meta.title) meta.title = id3Meta.title;
                if (id3Meta.artist) meta.artist = id3Meta.artist;
                if (id3Meta.albumArtist) meta.albumArtist = id3Meta.albumArtist;
                if (id3Meta.album) meta.album = id3Meta.album;
                if (id3Meta.trackNo) meta.trackNo = id3Meta.trackNo;
            }

            if (sz === 0 && id !== "data") break;
            pos = bodyStart + sz + (sz % 2);
        }
        if (!extractArt && byteRate > 0 && dataSize > 0) meta.duration = dataSize / byteRate;
        return meta;
    }

    async function parseAiffDynamic(file, extractArt = false) {
        const meta = { codec: "AIFF" };
        if (file.size < 12) return meta;
        const hdrBuf = await file.slice(0, 12).arrayBuffer();
        const hdrBytes = new Uint8Array(hdrBuf);
        if (String.fromCharCode(hdrBytes[0], hdrBytes[1], hdrBytes[2], hdrBytes[3]) !== "FORM") return meta;

        let pos = 12;
        while (pos + 8 <= file.size) {
            const cHdrBuf = await file.slice(pos, pos + 8).arrayBuffer();
            const cView = new DataView(cHdrBuf);
            const cBytes = new Uint8Array(cHdrBuf);
            const id = String.fromCharCode(cBytes[0], cBytes[1], cBytes[2], cBytes[3]);
            const sz = cView.getUint32(4, false);
            const bodyStart = pos + 8;
            if (bodyStart > file.size) break;

            if (!extractArt && id === "COMM" && sz >= 18 && bodyStart + 18 <= file.size) {
                const commBuf = await file.slice(bodyStart, bodyStart + 18).arrayBuffer();
                const cmView = new DataView(commBuf);
                const cmBytes = new Uint8Array(commBuf);
                const channels = cmView.getInt16(0, false);
                const sampleFrames = cmView.getUint32(2, false);
                const sampleSize = cmView.getInt16(6, false);
                // 80-bit IEEE extended float at offset 8
                const exp = ((cmBytes[8] & 0x7f) << 8) | cmBytes[9];
                const mantissaHi = cmView.getUint32(10, false);
                const sr = exp ? mantissaHi * Math.pow(2, exp - 16383 - 31) : 0;
                if (sr > 0 && sampleFrames > 0) {
                    meta.duration = sampleFrames / sr;
                    if (channels > 0 && sampleSize > 0) {
                        meta.bitrate = Math.round((sr * channels * sampleSize) / 1000);
                    }
                }
            } else if (!extractArt && (id === "NAME" || id === "AUTH") && sz > 0 && sz <= 65536) {
                const txtBuf = await file.slice(bodyStart, Math.min(file.size, bodyStart + sz)).arrayBuffer();
                const txt = decodeBytes(new Uint8Array(txtBuf), 0);
                if (txt) {
                    if (id === "NAME" && !meta.title) meta.title = txt;
                    if (id === "AUTH" && !meta.artist) meta.artist = txt;
                }
            } else if ((id === "ID3 " || id === "id3 ") && sz >= 10 && bodyStart + sz <= file.size) {
                const id3Meta = await parseID3v2Dynamic(file, extractArt, bodyStart);
                if (extractArt && id3Meta.coverBlob) {
                    meta.coverBlob = id3Meta.coverBlob;
                    return meta;
                }
                if (id3Meta.title) meta.title = id3Meta.title;
                if (id3Meta.artist) meta.artist = id3Meta.artist;
                if (id3Meta.albumArtist) meta.albumArtist = id3Meta.albumArtist;
                if (id3Meta.album) meta.album = id3Meta.album;
                if (id3Meta.trackNo) meta.trackNo = id3Meta.trackNo;
            }

            if (sz === 0) break;
            pos = bodyStart + sz + (sz % 2);
        }
        return meta;
    }

    async function parseMp4Dynamic(file, extractArt = false) {
        const meta = { codec: "AAC" };
        let pos = 0;
        let mdatSize = 0;
        let moovOffset = -1;
        let moovSize = 0;

        while (pos + 8 <= file.size) {
            const hBuf = await file.slice(pos, Math.min(file.size, pos + 16)).arrayBuffer();
            const hView = new DataView(hBuf);
            const hBytes = new Uint8Array(hBuf);
            let boxSize = hView.getUint32(0, false);
            const name = String.fromCharCode(hBytes[4], hBytes[5], hBytes[6], hBytes[7]);
            let hdrSize = 8;
            if (boxSize === 1 && hBuf.byteLength >= 16) {
                boxSize = hView.getUint32(8, false) * 4294967296 + hView.getUint32(12, false);
                hdrSize = 16;
            } else if (boxSize === 0) {
                boxSize = file.size - pos;
            }
            if (boxSize < hdrSize || pos + boxSize > file.size) break;

            if (name === "mdat") mdatSize += (boxSize - hdrSize);
            else if (name === "moov") {
                moovOffset = pos + hdrSize;
                moovSize = boxSize - hdrSize;
            }
            pos += boxSize;
        }

        if (moovOffset < 0 || moovSize <= 0 || moovSize > 16 * 1024 * 1024) return meta;
        const moovBuf = await file.slice(moovOffset, moovOffset + moovSize).arrayBuffer();
        const view = new DataView(moovBuf);
        const bytes = new Uint8Array(moovBuf);
        const utf8 = new TextDecoder("utf-8");

        const atomName = (off) => String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);

        function walk(start, end) {
            let p = start;
            while (p + 8 <= end) {
                const size = view.getUint32(p, false);
                if (size < 8 || p + size > end) break;
                const name = atomName(p + 4);
                const payload = p + 8;
                const payloadEnd = p + size;

                if (name === "udta" || name === "ilst" || name === "trak" || name === "mdia" || name === "minf" || name === "stbl") {
                    walk(payload, payloadEnd);
                } else if (name === "meta" && payload + 8 <= payloadEnd) {
                    const directChild = atomName(payload + 4);
                    const fullboxChild = payload + 12 <= payloadEnd ? atomName(payload + 8) : "";
                    if (directChild === "hdlr" || directChild === "ilst" || directChild === "keys") {
                        walk(payload, payloadEnd);
                    } else if (fullboxChild) {
                        walk(payload + 4, payloadEnd);
                    } else {
                        walk(payload + 4, payloadEnd);
                    }
                } else if (!extractArt && name === "stsd" && payload + 16 <= payloadEnd) {
                    const fmt = atomName(payload + 12);
                    if (fmt === "alac") meta.codec = "ALAC";
                    else if (fmt === "mp4a") meta.codec = "AAC";
                    else if (fmt === "fLaC") meta.codec = "FLAC";
                    else if (fmt === "Opus") meta.codec = "Opus";
                } else if (!extractArt && name === "mvhd" && payload + 20 <= payloadEnd) {
                    const version = bytes[payload];
                    if (version === 0) {
                        const timescale = view.getUint32(payload + 12, false);
                        const duration = view.getUint32(payload + 16, false);
                        if (timescale > 0 && duration > 0) meta.duration = duration / timescale;
                    } else if (version === 1 && payload + 32 <= payloadEnd) {
                        const timescale = view.getUint32(payload + 20, false);
                        const duration = view.getUint32(payload + 24, false) * 4294967296 + view.getUint32(payload + 28, false);
                        if (timescale > 0 && duration > 0) meta.duration = duration / timescale;
                    }
                } else if (extractArt && name === "covr") {
                    let q = payload;
                    while (q + 8 <= payloadEnd) {
                        const dSize = view.getUint32(q, false);
                        if (dSize < 16 || q + dSize > payloadEnd) break;
                        if (atomName(q + 4) === "data") {
                            const typeCode = view.getUint32(q + 8, false);
                            const mime = typeCode === 14 ? "image/png" : "image/jpeg";
                            meta.coverBlob = new Blob([bytes.subarray(q + 16, q + dSize)], { type: mime });
                            return;
                        }
                        q += dSize;
                    }
                } else if (!extractArt && (name === "\xa9nam" || name === "\xa9ART" || name === "aART" || name === "\xa9alb" || name === "trkn")) {
                    let q = payload;
                    while (q + 8 <= payloadEnd) {
                        const dSize = view.getUint32(q, false);
                        if (dSize < 16 || q + dSize > payloadEnd) break;
                        if (atomName(q + 4) === "data") {
                            const dataType = view.getUint32(q + 8, false) & 0x00ffffff;
                            const valStart = q + 16;
                            const valEnd = q + dSize;
                            if (name === "trkn" && valStart + 4 <= valEnd) {
                                const tr = view.getUint16(valStart + 2, false);
                                if (tr > 0) meta.trackNo = tr;
                            } else if (valStart < valEnd) {
                                const rawSlice = bytes.subarray(valStart, valEnd);
                                const txt = (dataType === 2
                                    ? new TextDecoder("utf-16be").decode(rawSlice)
                                    : utf8.decode(rawSlice)
                                ).replace(/\0+$/, "").trim();
                                if (txt) {
                                    if (name === "\xa9nam") meta.title = txt;
                                    else if (name === "\xa9ART") meta.artist = txt;
                                    else if (name === "aART") meta.albumArtist = txt;
                                    else if (name === "\xa9alb") meta.album = txt;
                                }
                            }
                            break;
                        }
                        q += dSize;
                    }
                }
                p += size;
            }
        }

        walk(0, bytes.length);
        if (!extractArt && meta.duration > 0 && mdatSize > 0) {
            meta.bitrate = Math.round((mdatSize * 8) / meta.duration / 1000);
        }
        return meta;
    }

    async function extractMetadata(file) {
        const fallback = parseFilenameFallback(file.name);
        let parsed = {};
        try {
            const sigBuf = await file.slice(0, Math.min(file.size, 12)).arrayBuffer();
            const sigBytes = new Uint8Array(sigBuf);
            const sig4 = String.fromCharCode(sigBytes[0] || 0, sigBytes[1] || 0, sigBytes[2] || 0, sigBytes[3] || 0);

            if (sig4.startsWith("ID3")) {
                parsed = await parseID3v2Dynamic(file, false, 0);
                const audioStart = parsed._audioStart || 0;
                const postSigBuf = await file.slice(audioStart, Math.min(file.size, audioStart + 8192)).arrayBuffer();
                const postBytes = new Uint8Array(postSigBuf);
                const postSig4 = String.fromCharCode(postBytes[0] || 0, postBytes[1] || 0, postBytes[2] || 0, postBytes[3] || 0);
                if (postSig4 === "fLaC") {
                    const flacInfo = await parseFlacDynamic(file, false, audioStart);
                    parsed = {
                        ...parsed,
                        ...flacInfo,
                        title: flacInfo.title || parsed.title,
                        artist: flacInfo.artist || parsed.artist,
                        albumArtist: flacInfo.albumArtist || parsed.albumArtist,
                        album: flacInfo.album || parsed.album,
                        trackNo: flacInfo.trackNo || parsed.trackNo
                    };
                } else {
                    const mpegInfo = parseMpegAudioInfo(postBytes, audioStart, file.size);
                    parsed = { ...mpegInfo, ...parsed };
                }
                if (!parsed.title || !parsed.artist || !parsed.album) {
                    const v1 = await parseID3v1(file);
                    parsed = {
                        ...parsed,
                        title: parsed.title || v1.title,
                        artist: parsed.artist || v1.artist,
                        album: parsed.album || v1.album,
                        trackNo: parsed.trackNo || v1.trackNo
                    };
                }
            } else if (sig4 === "fLaC") {
                parsed = await parseFlacDynamic(file, false, 0);
            } else if (sig4 === "OggS") {
                parsed = await parseOggDynamic(file, false);
            } else if (sig4 === "RIFF") {
                parsed = await parseWavDynamic(file, false);
            } else if (sig4 === "FORM") {
                parsed = await parseAiffDynamic(file, false);
            } else if (sigBytes.length >= 8 && String.fromCharCode(sigBytes[4], sigBytes[5], sigBytes[6], sigBytes[7]) === "ftyp") {
                parsed = await parseMp4Dynamic(file, false);
            } else if (file.name.toLowerCase().endsWith(".mp3")) {
                const mpegSlice = await file.slice(0, Math.min(file.size, 8192)).arrayBuffer();
                const mpegInfo = parseMpegAudioInfo(new Uint8Array(mpegSlice), 0, file.size);
                const v1 = await parseID3v1(file);
                parsed = { ...mpegInfo, ...v1 };
            }
        } catch (_) {}

        return {
            title: (parsed.title || fallback.title || file.name).trim(),
            artist: (parsed.artist || fallback.artist || "").trim(),
            albumArtist: (parsed.albumArtist || "").trim(),
            album: (parsed.album || "").trim(),
            trackNo: parsed.trackNo || fallback.trackNo || null,
            codec: (parsed.codec || inferCodecFromExt(file.name) || "").toUpperCase(),
            bitrate: typeof parsed.bitrate === "number" && isFinite(parsed.bitrate) && parsed.bitrate > 0 ? Math.round(parsed.bitrate) : null,
            duration: typeof parsed.duration === "number" && isFinite(parsed.duration) && parsed.duration > 0 ? parsed.duration : null
        };
    }

    async function extractEmbeddedCoverArt(file) {
        if (!file) return null;
        try {
            const sigBuf = await file.slice(0, Math.min(file.size, 12)).arrayBuffer();
            const sigBytes = new Uint8Array(sigBuf);
            const sig4 = String.fromCharCode(sigBytes[0] || 0, sigBytes[1] || 0, sigBytes[2] || 0, sigBytes[3] || 0);

            if (sig4.startsWith("ID3")) {
                const res = await parseID3v2Dynamic(file, true, 0);
                if (res.coverBlob) return res.coverBlob;
                const audioStart = res._audioStart || 0;
                if (audioStart + 4 <= file.size) {
                    const postSig = new Uint8Array(await file.slice(audioStart, audioStart + 4).arrayBuffer());
                    if (String.fromCharCode(postSig[0], postSig[1], postSig[2], postSig[3]) === "fLaC") {
                        const flacRes = await parseFlacDynamic(file, true, audioStart);
                        return flacRes.coverBlob || null;
                    }
                }
                return null;
            }
            if (sig4 === "fLaC") {
                const res = await parseFlacDynamic(file, true, 0);
                return res.coverBlob || null;
            }
            if (sig4 === "OggS") {
                const res = await parseOggDynamic(file, true);
                return res.coverBlob || null;
            }
            if (sig4 === "RIFF") {
                const res = await parseWavDynamic(file, true);
                return res.coverBlob || null;
            }
            if (sig4 === "FORM") {
                const res = await parseAiffDynamic(file, true);
                return res.coverBlob || null;
            }
            if (sigBytes.length >= 8 && String.fromCharCode(sigBytes[4], sigBytes[5], sigBytes[6], sigBytes[7]) === "ftyp") {
                const res = await parseMp4Dynamic(file, true);
                return res.coverBlob || null;
            }
        } catch (_) {}
        return null;
    }

    // ---------- IndexedDB (Library, Playlists & Chromium Handles) ----------
    function openDB() {
        if (!SUPPORTS_IDB) {
            return Promise.resolve(null);
        }
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve) => {
            try {
                const req = indexedDB.open(IDB_NAME, IDB_VERSION);
                req.onupgradeneeded = (ev) => {
                    const db = ev.target.result;
                    if (!db.objectStoreNames.contains("tracks")) db.createObjectStore("tracks", { keyPath: "id" });
                    if (!db.objectStoreNames.contains("playlists")) db.createObjectStore("playlists", { keyPath: "id" });
                    if (!db.objectStoreNames.contains("folders")) db.createObjectStore("folders", { keyPath: "id" });
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            } catch (_) {
                resolve(null);
            }
        });
        return dbPromise;
    }

    async function dbPutMany(storeName, items) {
        const db = await openDB();
        if (!db || !items.length) return;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(storeName, "readwrite");
                const store = tx.objectStore(storeName);
                items.forEach(item => store.put(item));
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch (_) {
                resolve();
            }
        });
    }

    async function dbDelete(storeName, key) {
        const db = await openDB();
        if (!db) return;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(storeName, "readwrite");
                tx.objectStore(storeName).delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch (_) {
                resolve();
            }
        });
    }

    async function dbClearAll() {
        const db = await openDB();
        if (!db) return;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(["tracks", "playlists", "folders"], "readwrite");
                tx.objectStore("tracks").clear();
                tx.objectStore("playlists").clear();
                tx.objectStore("folders").clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch (_) {
                resolve();
            }
        });
    }

    async function dbGetAll(storeName) {
        const db = await openDB();
        if (!db) return [];
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(storeName, "readonly");
                const req = tx.objectStore(storeName).getAll();
                req.onsuccess = () => resolve(req.result || []);
                req.onerror = () => resolve([]);
            } catch (_) {
                resolve([]);
            }
        });
    }

    async function refreshOutdatedMetadata(force = false) {
        if (isRefreshingMeta) return;
        const outdated = tracks.filter(t =>
            (force || !t.metaVersion || t.metaVersion < META_VERSION || !t.codec) &&
            (sessionFiles.has(t.id) || t.handle)
        );
        if (!outdated.length) return;

        isRefreshingMeta = true;
        const updatedBatch = [];
        try {
            for (const trk of outdated) {
                try {
                    let file = sessionFiles.get(trk.id);
                    if (!file && trk.handle) {
                        const perm = typeof trk.handle.queryPermission === "function"
                            ? await trk.handle.queryPermission({ mode: "read" })
                            : "granted";
                        if (perm !== "granted") continue;
                        file = await trk.handle.getFile();
                        sessionFiles.set(trk.id, file);
                    }
                    if (!file) continue;
                    const meta = await extractMetadata(file);
                    Object.assign(trk, meta, { metaVersion: META_VERSION });
                    updatedBatch.push(trk);
                } catch (_) {}
            }
            if (updatedBatch.length) {
                await dbPutMany("tracks", updatedBatch);
                renderTrackTable();
                renderNowPlaying();
            }
        } finally {
            isRefreshingMeta = false;
        }
    }

    async function computeNeedsReconnect() {
        if (!tracks.length) return false;
        const checkedFolderHandles = new Set();
        const folderPermMap = new Map();

        for (const f of folderHandles) {
            if (f.handle && !checkedFolderHandles.has(f.handle)) {
                checkedFolderHandles.add(f.handle);
                try {
                    const perm = typeof f.handle.queryPermission === "function"
                        ? await f.handle.queryPermission({ mode: "read" })
                        : "granted";
                    folderPermMap.set(f.id, perm === "granted");
                    if (perm !== "granted") return true;
                } catch (_) {
                    return true;
                }
            }
        }

        let checkedTrackSample = false;
        for (const t of tracks) {
            if (sessionFiles.has(t.id)) continue;
            if (!t.handle) return true;
            if (t.folderId && folderPermMap.get(t.folderId)) continue;
            if (!checkedTrackSample || !t.folderId) {
                checkedTrackSample = true;
                try {
                    const perm = typeof t.handle.queryPermission === "function"
                        ? await t.handle.queryPermission({ mode: "read" })
                        : "granted";
                    if (perm !== "granted") return true;
                } catch (_) {
                    return true;
                }
            }
        }
        return false;
    }

    async function hydrateChromiumLibrary() {
        if (!SUPPORTS_IDB) return;
        const [savedTracks, savedPlaylists, savedFolders] = await Promise.all([
            dbGetAll("tracks"),
            dbGetAll("playlists"),
            dbGetAll("folders")
        ]);
        tracks = Array.isArray(savedTracks) ? savedTracks : [];
        playlists = Array.isArray(savedPlaylists) ? savedPlaylists : [];
        folderHandles = Array.isArray(savedFolders) ? savedFolders : [];

        needsPermissionReconnect = await computeNeedsReconnect();

        if (state.activePlaylistId !== "all" && !playlists.some(p => p.id === state.activePlaylistId)) {
            state.activePlaylistId = "all";
            saveState();
        }
        renderAll();
        if (tracks.length) {
            await refreshOutdatedMetadata();
        }
    }

    async function relinkEntriesToExistingTracks(entries, folderMeta = null) {
        if (!entries || !entries.length) return 0;

        // Build lookup indexes for disconnected existing tracks
        const byRel = new Map();
        const byNameSize = new Map();
        const byName = new Map();
        tracks.forEach((t) => {
            if (t.relativePath) byRel.set(t.relativePath.toLowerCase(), t);
            const nsKey = `${(t.fileName || "").toLowerCase()}|${t.size || 0}`;
            if (!byNameSize.has(nsKey)) byNameSize.set(nsKey, []);
            byNameSize.get(nsKey).push(t);
            const nKey = (t.fileName || "").toLowerCase();
            if (!byName.has(nKey)) byName.set(nKey, []);
            byName.get(nKey).push(t);
        });

        const updatedTracks = [];
        let matchedCount = 0;

        for (let i = 0; i < entries.length; i++) {
            const item = entries[i];
            const file = item.file || (item.handle ? await item.handle.getFile() : null);
            if (!file) continue;

            const rel = (item.relativePath || file.webkitRelativePath || file.name).toLowerCase();
            let trk = byRel.get(rel);
            if (!trk) {
                const nsList = byNameSize.get(`${file.name.toLowerCase()}|${file.size || 0}`) || [];
                trk = nsList.find(cand => !sessionFiles.has(cand.id)) || nsList[0] || null;
            }
            if (!trk) {
                const nList = byName.get(file.name.toLowerCase()) || [];
                if (nList.length === 1) trk = nList[0];
            }
            if (!trk) continue;

            sessionFiles.set(trk.id, file);
            if (SUPPORTS_FS_HANDLES && item.handle) {
                trk.handle = item.handle;
            }
            if (folderMeta) {
                trk.folderId = folderMeta.id;
            }
            if (!trk.metaVersion || trk.metaVersion < META_VERSION || !trk.codec) {
                const meta = await extractMetadata(file);
                Object.assign(trk, meta, { metaVersion: META_VERSION });
            }
            updatedTracks.push(trk);
            matchedCount++;
        }

        if (matchedCount > 0) {
            if (folderMeta && SUPPORTS_FS_HANDLES && folderMeta.handle) {
                folderHandles.push(folderMeta);
                await dbPutMany("folders", [folderMeta]);
            }
            await dbPutMany("tracks", updatedTracks);
            needsPermissionReconnect = await computeNeedsReconnect();
            renderAll();
            notify(`Reconnected ${matchedCount} track${matchedCount === 1 ? "" : "s"}.`);
        } else {
            notify("No matching library tracks found in the selected files/folder.");
        }
        return matchedCount;
    }

    async function reconnectLibraryPermissions() {
        const firstHandle = folderHandles.find(f => f.handle)?.handle || tracks.find(t => t.handle)?.handle;
        let grantedAny = false;

        if (SUPPORTS_FS_HANDLES && firstHandle && typeof firstHandle.requestPermission === "function") {
            try {
                // Call requestPermission immediately to preserve Chrome transient user activation
                const firstRes = await firstHandle.requestPermission({ mode: "read" });
                if (firstRes === "granted") grantedAny = true;

                for (const f of folderHandles) {
                    if (!f.handle || f.handle === firstHandle) continue;
                    try {
                        const res = await f.handle.requestPermission({ mode: "read" });
                        if (res === "granted") grantedAny = true;
                    } catch (_) {}
                }
                for (const t of tracks) {
                    if (!t.handle || t.handle === firstHandle || t.folderId) continue;
                    try {
                        const cur = await t.handle.queryPermission({ mode: "read" });
                        if (cur === "granted") {
                            grantedAny = true;
                            continue;
                        }
                        const res = await t.handle.requestPermission({ mode: "read" });
                        if (res === "granted") grantedAny = true;
                    } catch (_) {}
                }
            } catch (_) {}

            if (grantedAny) {
                needsPermissionReconnect = await computeNeedsReconnect();
                renderReconnectButton();
                await refreshOutdatedMetadata();
                if (!needsPermissionReconnect) {
                    notify("Local music library permissions restored.");
                    return;
                }
            }
        }

        // Fallback when tracks were saved from <input> without persistent handles (e.g. iframe)
        const folderExpected = folderHandles.length > 0 || tracks.some(t => t.relativePath && t.relativePath.includes("/"));
        if (SUPPORTS_FS_HANDLES) {
            try {
                if (folderExpected && typeof window.showDirectoryPicker === "function") {
                    const dirHandle = await window.showDirectoryPicker({ mode: "read" });
                    const folderMeta = {
                        id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                        name: dirHandle.name,
                        handle: dirHandle
                    };
                    const collected = await walkDirectoryHandle(dirHandle, dirHandle.name);
                    await relinkEntriesToExistingTracks(collected, folderMeta);
                    return;
                }
                const handles = await window.showOpenFilePicker({
                    multiple: true,
                    types: [{
                        description: "Audio Files",
                        accept: { "audio/*": [".mp3", ".flac", ".wav", ".ogg", ".opus", ".m4a", ".aac", ".alac", ".aiff", ".webm"] }
                    }]
                });
                await relinkEntriesToExistingTracks(handles.map(h => ({ handle: h, relativePath: h.name })));
                return;
            } catch (err) {
                if (err && err.name === "AbortError") return;
            }
        }

        if (folderExpected && dom?.relinkFolderInput) {
            dom.relinkFolderInput.click();
        } else if (dom?.relinkFileInput) {
            dom.relinkFileInput.click();
        }
    }

    // ---------- Track Import & Folder Scanning ----------
    async function walkDirectoryHandle(dirHandle, prefixPath = "") {
        const collected = [];
        for await (const entry of dirHandle.values()) {
            const rel = prefixPath ? `${prefixPath}/${entry.name}` : entry.name;
            if (entry.kind === "file" && isAudioFilename(entry.name)) {
                collected.push({ handle: entry, relativePath: rel });
            } else if (entry.kind === "directory") {
                const sub = await walkDirectoryHandle(entry, rel);
                collected.push(...sub);
            }
        }
        return collected;
    }

    async function ingestTrackEntries(entries, folderMeta = null) {
        if (!entries || !entries.length) return;
        const existingMap = new Map(tracks.map(t => [`${t.fileName}|${t.size || 0}|${t.relativePath || ""}`, t]));
        const newTracks = [];
        const updatedTracks = [];
        const baseTs = Date.now();

        for (let i = 0; i < entries.length; i++) {
            const item = entries[i];
            const file = item.file || (item.handle ? await item.handle.getFile() : null);
            if (!file || (!isAudioFilename(file.name) && !(file.type && file.type.startsWith("audio/")))) continue;

            const relPath = item.relativePath || file.webkitRelativePath || file.name;
            const dedupeKey = `${file.name}|${file.size || 0}|${relPath}`;
            const existing = existingMap.get(dedupeKey);
            if (existing) {
                sessionFiles.set(existing.id, file);
                if (SUPPORTS_FS_HANDLES && item.handle) existing.handle = item.handle;
                if (!existing.metaVersion || existing.metaVersion < META_VERSION || !existing.codec) {
                    const meta = await extractMetadata(file);
                    Object.assign(existing, meta, { metaVersion: META_VERSION });
                }
                updatedTracks.push(existing);
                continue;
            }

            const meta = await extractMetadata(file);
            const id = `trk_${baseTs}_${i}_${Math.random().toString(36).slice(2, 7)}`;
            const trackObj = {
                id,
                fileName: file.name,
                relativePath: relPath,
                size: file.size || 0,
                addedAt: baseTs + i,
                metaVersion: META_VERSION,
                title: meta.title,
                artist: meta.artist,
                albumArtist: meta.albumArtist,
                album: meta.album,
                trackNo: meta.trackNo,
                codec: meta.codec,
                bitrate: meta.bitrate,
                duration: meta.duration,
                folderId: folderMeta ? folderMeta.id : null,
                handle: SUPPORTS_FS_HANDLES && item.handle ? item.handle : null
            };
            sessionFiles.set(id, file);
            existingMap.set(dedupeKey, trackObj);
            newTracks.push(trackObj);
        }

        if (!newTracks.length && !updatedTracks.length) {
            notify("No new audio files found.");
            return;
        }

        if (newTracks.length) {
            tracks.push(...newTracks);
            if (state.activePlaylistId !== "all") {
                const pl = playlists.find(p => p.id === state.activePlaylistId);
                if (pl) {
                    pl.trackIds.push(...newTracks.map(t => t.id));
                    await dbPutMany("playlists", [pl]);
                }
            }
        }

        await dbPutMany("tracks", [...newTracks, ...updatedTracks]);
        if (folderMeta && folderMeta.handle) await dbPutMany("folders", [folderMeta]);
        needsPermissionReconnect = await computeNeedsReconnect();

        renderAll();
        if (newTracks.length) {
            notify(`Added ${newTracks.length} track${newTracks.length === 1 ? "" : "s"}.`);
        } else {
            notify(`Reconnected ${updatedTracks.length} existing track${updatedTracks.length === 1 ? "" : "s"}.`);
        }
    }

    async function handleAddFilesClick() {
        if (SUPPORTS_FS_HANDLES) {
            try {
                const handles = await window.showOpenFilePicker({
                    multiple: true,
                    types: [{
                        description: "Audio Files",
                        accept: { "audio/*": [".mp3", ".flac", ".wav", ".ogg", ".opus", ".m4a", ".aac", ".alac", ".aiff", ".webm"] }
                    }]
                });
                await ingestTrackEntries(handles.map(h => ({ handle: h, relativePath: h.name })));
                return;
            } catch (err) {
                if (err && err.name === "AbortError") return;
            }
        }
        dom?.fileInput?.click();
    }

    async function handleAddFolderClick() {
        if (SUPPORTS_FS_HANDLES && typeof window.showDirectoryPicker === "function") {
            try {
                const dirHandle = await window.showDirectoryPicker({ mode: "read" });
                const folderMeta = {
                    id: `fld_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    name: dirHandle.name,
                    handle: dirHandle
                };
                folderHandles.push(folderMeta);
                const collected = await walkDirectoryHandle(dirHandle, dirHandle.name);
                await ingestTrackEntries(collected, folderMeta);
                return;
            } catch (err) {
                if (err && err.name === "AbortError") return;
            }
        }
        dom?.folderInput?.click();
    }

    async function handleDropTransfer(dataTransfer) {
        if (!dataTransfer) return;
        const entries = [];
        const items = Array.from(dataTransfer.items || []);
        if (SUPPORTS_FS_HANDLES && items.length && typeof items[0].getAsFileSystemHandle === "function") {
            for (const item of items) {
                if (item.kind !== "file") continue;
                try {
                    const h = await item.getAsFileSystemHandle();
                    if (!h) continue;
                    if (h.kind === "file") {
                        entries.push({ handle: h, relativePath: h.name });
                    } else if (h.kind === "directory") {
                        const folderMeta = { id: `fld_${Date.now()}`, name: h.name, handle: h };
                        folderHandles.push(folderMeta);
                        const sub = await walkDirectoryHandle(h, h.name);
                        entries.push(...sub);
                        if (SUPPORTS_FS_HANDLES) await dbPutMany("folders", [folderMeta]);
                    }
                } catch (_) {}
            }
            if (entries.length) {
                await ingestTrackEntries(entries);
                return;
            }
        }

        const files = Array.from(dataTransfer.files || []).filter(f =>
            isAudioFilename(f.name) || (f.type && f.type.startsWith("audio/"))
        );
        if (files.length) {
            await ingestTrackEntries(files.map(f => ({ file: f, relativePath: f.name })));
        }
    }

    // ---------- Filtering, Sorting & Playback Queue ----------
    function getScopedTracks() {
        if (state.activePlaylistId === "all") return tracks.slice();
        const pl = playlists.find(p => p.id === state.activePlaylistId);
        if (!pl) return [];
        const byId = new Map(tracks.map(t => [t.id, t]));
        return pl.trackIds.map(id => byId.get(id)).filter(Boolean);
    }

    function getTrackCellText(t, colKey) {
        if (!t) return "";
        if (colKey === "trackNo") return t.trackNo != null ? String(t.trackNo) : "";
        if (colKey === "duration") return formatClock(t.duration);
        if (colKey === "bitrate") return t.bitrate ? `${t.bitrate} kbps` : "";
        if (colKey === "titleArtist") return [t.title, t.artist || t.albumArtist].filter(Boolean).join(" / ");
        if (colKey === "artistAlbum") return [t.artist || t.albumArtist, t.album].filter(Boolean).join(" / ");
        if (colKey === "albumArtistAlbum") return [t.albumArtist || t.artist, t.album].filter(Boolean).join(" / ");
        return t[colKey] || "";
    }

    function getVisibleTracks() {
        let list = getScopedTracks();
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            list = list.filter(t =>
                (t.title && t.title.toLowerCase().includes(q)) ||
                (t.artist && t.artist.toLowerCase().includes(q)) ||
                (t.albumArtist && t.albumArtist.toLowerCase().includes(q)) ||
                (t.album && t.album.toLowerCase().includes(q)) ||
                (t.codec && t.codec.toLowerCase().includes(q)) ||
                (t.fileName && t.fileName.toLowerCase().includes(q))
            );
        }

        const key = state.sortBy || "addedAt";
        const dir = state.sortDir === "desc" ? -1 : 1;
        if (key === "addedAt") {
            return dir === 1 ? list : list.slice().reverse();
        }

        return list.slice().sort((a, b) => {
            if (key === "trackNo" || key === "duration" || key === "bitrate") {
                const av = a[key] != null ? a[key] : Number.MAX_SAFE_INTEGER;
                const bv = b[key] != null ? b[key] : Number.MAX_SAFE_INTEGER;
                if (av !== bv) return (av - bv) * dir;
                return String(a.title || "").localeCompare(String(b.title || "")) * dir;
            }
            const as = String(getTrackCellText(a, key) || "");
            const bs = String(getTrackCellText(b, key) || "");
            if (!as && bs) return 1;
            if (as && !bs) return -1;
            const cmp = as.localeCompare(bs, undefined, { numeric: true, sensitivity: "base" });
            if (cmp !== 0) return cmp * dir;
            return ((a.trackNo || 9999) - (b.trackNo || 9999));
        });
    }

    function clearActiveCoverArt() {
        if (currentCoverUrl) {
            URL.revokeObjectURL(currentCoverUrl);
            currentCoverUrl = null;
        }
        if (dom && dom.npArtImg) {
            dom.npArtImg.removeAttribute("src");
            dom.npArtImg.classList.add("hidden");
            dom.npArtFallback.classList.remove("hidden");
        }
    }

    async function loadActiveCoverArt(trackId, file) {
        clearActiveCoverArt();
        if (!file || currentTrackId !== trackId) return;
        const blob = await extractEmbeddedCoverArt(file);
        if (!blob || currentTrackId !== trackId || !dom) return;
        currentCoverUrl = URL.createObjectURL(blob);
        dom.npArtImg.src = currentCoverUrl;
        dom.npArtImg.classList.remove("hidden");
        dom.npArtFallback.classList.add("hidden");
    }

    function ensureAudioPipeline() {
        if (playerAudio) return;
        playerAudio = new Audio();
        playerAudio.preload = "metadata";

        const bridge = window.mireAudioBridge;
        if (bridge && typeof bridge.createMediaSource === "function") {
            playerSource = bridge.createMediaSource(playerAudio);
        }

        playerAudio.addEventListener("loadedmetadata", async () => {
            if (!currentTrackId || !isFinite(playerAudio.duration) || playerAudio.duration <= 0) return;
            const trk = tracks.find(t => t.id === currentTrackId);
            if (trk) {
                let changed = false;
                if (!trk.duration || Math.abs(trk.duration - playerAudio.duration) > 1) {
                    trk.duration = playerAudio.duration;
                    changed = true;
                    updateTrackCell(trk.id, "duration", formatClock(trk.duration));
                }
                if (!trk.bitrate && trk.size > 0) {
                    trk.bitrate = Math.round((trk.size * 8) / playerAudio.duration / 1000);
                    changed = true;
                    updateTrackCell(trk.id, "bitrate", trk.bitrate ? `${trk.bitrate} kbps` : "");
                }
                if (changed && SUPPORTS_IDB) {
                    await dbPutMany("tracks", [trk]);
                }
            }
            updateTransportTimeUI();
        });

        playerAudio.addEventListener("timeupdate", () => {
            if (!isSeeking) updateTransportTimeUI();
        });

        playerAudio.addEventListener("ended", () => {
            if (state.repeat === "one") {
                playerAudio.currentTime = 0;
                playerAudio.play().catch(() => {});
                return;
            }
            playNextTrack(true);
        });

        if (bridge && typeof bridge.subscribeVolume === "function" && !unsubVolume) {
            unsubVolume = bridge.subscribeVolume(syncVolumeUI);
        }
    }

    async function resolveTrackFile(trk) {
        if (!trk) return null;
        if (sessionFiles.has(trk.id)) return sessionFiles.get(trk.id);
        if (trk.handle && typeof trk.handle.getFile === "function") {
            try {
                let perm = typeof trk.handle.queryPermission === "function"
                    ? await trk.handle.queryPermission({ mode: "read" })
                    : "granted";
                if (perm !== "granted" && typeof trk.handle.requestPermission === "function") {
                    perm = await trk.handle.requestPermission({ mode: "read" });
                }
                if (perm === "granted") {
                    const file = await trk.handle.getFile();
                    sessionFiles.set(trk.id, file);
                    needsPermissionReconnect = await computeNeedsReconnect();
                    renderReconnectButton();
                    return file;
                }
                needsPermissionReconnect = true;
                renderReconnectButton();
            } catch (_) {
                needsPermissionReconnect = true;
                renderReconnectButton();
            }
        } else {
            needsPermissionReconnect = true;
            renderReconnectButton();
        }
        return null;
    }

    async function playTrackById(id) {
        const trk = tracks.find(t => t.id === id);
        if (!trk) return;
        ensureAudioPipeline();

        const file = await resolveTrackFile(trk);
        if (!file) {
            notify("Local file access needed. Click Reconnect above to restore playback.");
            return;
        }

        // Upgrade stale metadata seamlessly on playback if needed
        if (!trk.metaVersion || trk.metaVersion < META_VERSION || !trk.codec) {
            const freshMeta = await extractMetadata(file);
            Object.assign(trk, freshMeta, { metaVersion: META_VERSION });
            if (SUPPORTS_IDB) dbPutMany("tracks", [trk]);
            renderTrackTable();
        }

        if (currentObjectUrl) {
            URL.revokeObjectURL(currentObjectUrl);
            currentObjectUrl = null;
        }

        currentTrackId = trk.id;
        currentObjectUrl = URL.createObjectURL(file);
        playerAudio.src = currentObjectUrl;
        playerAudio.currentTime = 0;

        // Async single-track cover extraction (immediately revokes prior cover URL)
        loadActiveCoverArt(trk.id, file);

        const bridge = window.mireAudioBridge;
        if (bridge && playerSource) {
            bridge.claimExternalAudio(playerAudio, playerSource, handleBridgeYield);
        }

        try {
            await playerAudio.play();
            isPlaying = true;
            if (bridge) bridge.setExternalPlaying(playerAudio, true);
            if (typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("music_player_played");
            }
        } catch (_) {
            isPlaying = false;
            if (bridge) bridge.setExternalPlaying(playerAudio, false);
        }
        renderNowPlaying();
        highlightPlayingRow();
    }

    function handleBridgeYield() {
        if (playerAudio && !playerAudio.paused) {
            playerAudio.pause();
        }
        isPlaying = false;
        renderPlayStateUI();
    }

    function togglePlayPause() {
        const queue = getVisibleTracks();
        if (!currentTrackId) {
            if (queue.length) playTrackById(queue[0].id);
            return;
        }
        if (!playerAudio || !playerAudio.src) {
            playTrackById(currentTrackId);
            return;
        }

        const bridge = window.mireAudioBridge;
        if (isPlaying) {
            playerAudio.pause();
            isPlaying = false;
            if (bridge) bridge.setExternalPlaying(playerAudio, false);
            renderPlayStateUI();
        } else {
            if (bridge && playerSource) {
                bridge.claimExternalAudio(playerAudio, playerSource, handleBridgeYield);
            }
            playerAudio.play().then(() => {
                isPlaying = true;
                if (bridge) bridge.setExternalPlaying(playerAudio, true);
                renderPlayStateUI();
            }).catch(() => {});
        }
    }

    function playNextTrack(fromEnded = false) {
        const queue = getVisibleTracks();
        if (!queue.length) return;
        const idx = queue.findIndex(t => t.id === currentTrackId);

        if (state.shuffle) {
            if (queue.length === 1) {
                if (state.repeat === "all" || !fromEnded) playTrackById(queue[0].id);
                else stopPlayback();
                return;
            }
            if (currentTrackId) shuffleHistory.push(currentTrackId);
            let nextIdx = idx;
            while (nextIdx === idx) {
                nextIdx = Math.floor(Math.random() * queue.length);
            }
            playTrackById(queue[nextIdx].id);
            return;
        }

        if (idx < 0) {
            playTrackById(queue[0].id);
            return;
        }
        if (idx + 1 < queue.length) {
            playTrackById(queue[idx + 1].id);
        } else if (state.repeat === "all" || !fromEnded) {
            playTrackById(queue[0].id);
        } else {
            stopPlayback();
        }
    }

    function playPrevTrack() {
        if (playerAudio && playerAudio.currentTime > 3) {
            playerAudio.currentTime = 0;
            updateTransportTimeUI();
            return;
        }
        const queue = getVisibleTracks();
        if (!queue.length) return;

        if (state.shuffle && shuffleHistory.length) {
            const prevId = shuffleHistory.pop();
            if (tracks.some(t => t.id === prevId)) {
                playTrackById(prevId);
                return;
            }
        }
        const idx = queue.findIndex(t => t.id === currentTrackId);
        const prevIdx = idx > 0 ? idx - 1 : queue.length - 1;
        playTrackById(queue[prevIdx].id);
    }

    function stopPlayback() {
        if (playerAudio) {
            playerAudio.pause();
            playerAudio.currentTime = 0;
        }
        isPlaying = false;
        const bridge = window.mireAudioBridge;
        if (bridge && playerAudio) {
            bridge.releaseExternalAudio(playerAudio);
        }
        renderPlayStateUI();
        updateTransportTimeUI();
    }

    // ---------- Window Management (Modes, Drag, 8-Way Resize) ----------
    function clampGeometry() {
        const vw = window.innerWidth || 1280;
        const vh = window.innerHeight || 800;
        const isMini = state.mode === "minimized";

        const minW = isMini ? 290 : 380;
        const maxW = Math.max(minW, vw - 16);
        if (isMini) {
            state.miniWidth = Math.max(minW, Math.min(state.miniWidth || 400, maxW));
        } else {
            state.width = Math.max(minW, Math.min(state.width || 720, maxW));
            const maxH = Math.max(250, vh - 16);
            state.height = Math.max(250, Math.min(state.height || 480, maxH));
        }

        const activeW = isMini ? state.miniWidth : state.width;
        const activeH = isMini ? 70 : state.height;
        state.x = Math.max(8, Math.min(state.x, Math.max(8, vw - Math.min(activeW, vw - 16) - 8)));
        state.y = Math.max(8, Math.min(state.y, Math.max(8, vh - Math.min(activeH, vh - 16) - 8)));
    }

    function applyGeometry() {
        if (!rootEl) return;
        clampGeometry();
        const isMini = state.mode === "minimized";
        const activeW = isMini ? state.miniWidth : state.width;

        rootEl.setAttribute("data-mode", state.mode);
        rootEl.style.left = `${Math.round(state.x)}px`;
        rootEl.style.top = `${Math.round(state.y)}px`;
        rootEl.style.width = `${Math.round(activeW)}px`;
        rootEl.style.height = isMini ? "auto" : `${Math.round(state.height)}px`;
        rootEl.setAttribute("data-narrow", !isMini && activeW < 520 ? "true" : "false");
        updateBottomMarquees();
    }

    function setMode(nextMode) {
        if (nextMode !== "closed" && !isDesktop()) {
            notify("Music Player works on desktop only.");
            return;
        }
        ensureMounted();
        state.mode = nextMode;

        const launcherBtn = document.getElementById("open-music-player");
        if (nextMode === "closed") {
            stopPlayback();
            clearActiveCoverArt();
            currentTrackId = null;
            rootEl.classList.add("hidden");
            closeAllPopovers();
            if (launcherBtn) launcherBtn.classList.remove("selected");
        } else {
            rootEl.classList.remove("hidden");
            applyGeometry();
            if (launcherBtn) launcherBtn.classList.add("selected");
            requestAnimationFrame(updateBottomMarquees);
        }
        saveState();
    }

    function initDragAndResize() {
        let dragState = null;

        const onDragStart = (e) => {
            if (e.button !== 0) return;
            if (e.target.closest("button, input, select, a, .mp-popover")) return;
            e.preventDefault();
            dragState = {
                startX: e.clientX,
                startY: e.clientY,
                origX: state.x,
                origY: state.y
            };
            rootEl.classList.add("is-dragging");
            document.addEventListener("pointermove", onDragMove);
            document.addEventListener("pointerup", onDragEnd);
        };

        const onDragMove = (e) => {
            if (!dragState) return;
            const vw = window.innerWidth || 1280;
            const vh = window.innerHeight || 800;
            const rect = rootEl.getBoundingClientRect();
            const nx = dragState.origX + (e.clientX - dragState.startX);
            const ny = dragState.origY + (e.clientY - dragState.startY);
            state.x = Math.max(8, Math.min(nx, Math.max(8, vw - rect.width - 8)));
            state.y = Math.max(8, Math.min(ny, Math.max(8, vh - Math.min(rect.height, 80) - 8)));
            rootEl.style.left = `${Math.round(state.x)}px`;
            rootEl.style.top = `${Math.round(state.y)}px`;
        };

        const onDragEnd = () => {
            if (!dragState) return;
            dragState = null;
            rootEl.classList.remove("is-dragging");
            document.removeEventListener("pointermove", onDragMove);
            document.removeEventListener("pointerup", onDragEnd);
            saveState();
        };

        dom.header.addEventListener("pointerdown", onDragStart);
        dom.miniTop.addEventListener("pointerdown", onDragStart);

        let resizeState = null;
        const onResizeStart = (e) => {
            const handle = e.target.closest(".mp-resize-handle");
            if (!handle || e.button !== 0) return;
            e.preventDefault();
            const dir = handle.dataset.dir;
            const isMini = state.mode === "minimized";
            resizeState = {
                dir,
                isMini,
                startX: e.clientX,
                startY: e.clientY,
                origX: state.x,
                origY: state.y,
                origW: isMini ? state.miniWidth : state.width,
                origH: state.height
            };
            rootEl.classList.add("is-resizing");
            document.addEventListener("pointermove", onResizeMove);
            document.addEventListener("pointerup", onResizeEnd);
        };

        const onResizeMove = (e) => {
            if (!resizeState) return;
            const vw = window.innerWidth || 1280;
            const vh = window.innerHeight || 800;
            const dx = e.clientX - resizeState.startX;
            const dy = e.clientY - resizeState.startY;
            const d = resizeState.dir;
            const minW = resizeState.isMini ? 290 : 380;
            const minH = 250;

            let nx = resizeState.origX;
            let ny = resizeState.origY;
            let nw = resizeState.origW;
            let nh = resizeState.origH;

            if (d.includes("e")) {
                nw = Math.max(minW, Math.min(resizeState.origW + dx, vw - nx - 8));
            }
            if (d.includes("w")) {
                const maxLeft = resizeState.origX + resizeState.origW - minW;
                nx = Math.max(8, Math.min(resizeState.origX + dx, maxLeft));
                nw = resizeState.origW + (resizeState.origX - nx);
            }
            if (!resizeState.isMini) {
                if (d.includes("s")) {
                    nh = Math.max(minH, Math.min(resizeState.origH + dy, vh - ny - 8));
                }
                if (d.includes("n")) {
                    const maxTop = resizeState.origY + resizeState.origH - minH;
                    ny = Math.max(8, Math.min(resizeState.origY + dy, maxTop));
                    nh = resizeState.origH + (resizeState.origY - ny);
                }
            }

            state.x = nx;
            state.y = ny;
            if (resizeState.isMini) {
                state.miniWidth = nw;
            } else {
                state.width = nw;
                state.height = nh;
            }
            applyGeometry();
        };

        const onResizeEnd = () => {
            if (!resizeState) return;
            resizeState = null;
            rootEl.classList.remove("is-resizing");
            document.removeEventListener("pointermove", onResizeMove);
            document.removeEventListener("pointerup", onResizeEnd);
            saveState();
        };

        rootEl.addEventListener("pointerdown", onResizeStart);
    }

    // ---------- Rendering & Popovers ----------
    function closeAllPopovers() {
        if (!dom) return;
        dom.prefPopover.classList.add("hidden");
        dom.prefBtn.setAttribute("aria-expanded", "false");
        dom.infoPopover.classList.add("hidden");
        dom.infoBtn.setAttribute("aria-expanded", "false");
        dom.playlistPicker.classList.add("hidden");
    }

    function renderReconnectButton() {
        if (!dom || !dom.reconnectBtn) return;
        const show = needsPermissionReconnect && tracks.length > 0;
        dom.reconnectBtn.classList.toggle("hidden", !show);
    }

    function renderPlaylists() {
        if (!dom) return;
        const items = [
            `<div class="mp-playlist-item ${state.activePlaylistId === "all" ? "is-selected" : ""}" data-pid="all">
                <span class="mp-playlist-name" title="All Tracks">All Tracks</span>
                <span class="mp-playlist-count">${tracks.length}</span>
             </div>`
        ];

        const trackIdSet = new Set(tracks.map(t => t.id));
        playlists.forEach((pl) => {
            const count = pl.trackIds.filter(id => trackIdSet.has(id)).length;
            const isRenaming = inlinePlaylistDraft && inlinePlaylistDraft.mode === "rename" && inlinePlaylistDraft.id === pl.id;
            if (isRenaming) {
                items.push(
                    `<div class="mp-playlist-item is-selected" data-pid="${escapeHtml(pl.id)}">
                        <input type="text" class="mp-pl-inline-input" data-pl-edit="${escapeHtml(pl.id)}" value="${escapeHtml(pl.name)}" style="width:100%;font-size:11px;padding:2px 4px;border:1px solid var(--accent-color);border-radius:3px;background:var(--background-color);color:var(--font-color-primary);outline:none;" />
                     </div>`
                );
            } else {
                items.push(
                    `<div class="mp-playlist-item ${state.activePlaylistId === pl.id ? "is-selected" : ""}" data-pid="${escapeHtml(pl.id)}">
                        <span class="mp-playlist-name" title="${escapeHtml(pl.name)}">${escapeHtml(pl.name)}</span>
                        <span class="mp-playlist-actions">
                            <button type="button" class="mp-playlist-mini-btn" data-pl-rename="${escapeHtml(pl.id)}" title="Rename">✎</button>
                            <button type="button" class="mp-playlist-mini-btn" data-pl-delete="${escapeHtml(pl.id)}" title="Delete">×</button>
                        </span>
                        <span class="mp-playlist-count">${count}</span>
                     </div>`
                );
            }
        });

        if (inlinePlaylistDraft && inlinePlaylistDraft.mode === "create") {
            items.push(
                `<div class="mp-playlist-item is-selected">
                    <input type="text" class="mp-pl-inline-input" data-pl-create="true" placeholder="Playlist name..." style="width:100%;font-size:11px;padding:2px 4px;border:1px solid var(--accent-color);border-radius:3px;background:var(--background-color);color:var(--font-color-primary);outline:none;" />
                 </div>`
            );
        }

        dom.playlistsList.innerHTML = items.join("");

        const inlineInput = dom.playlistsList.querySelector(".mp-pl-inline-input");
        if (inlineInput) {
            inlineInput.focus();
            inlineInput.select();
            const commit = async () => {
                const name = inlineInput.value.trim();
                const draft = inlinePlaylistDraft;
                inlinePlaylistDraft = null;
                if (draft?.mode === "create" && name) {
                    const pl = {
                        id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                        name,
                        trackIds: [],
                        createdAt: Date.now()
                    };
                    playlists.push(pl);
                    state.activePlaylistId = pl.id;
                    saveState();
                    if (SUPPORTS_IDB) await dbPutMany("playlists", [pl]);
                } else if (draft?.mode === "rename" && name) {
                    const target = playlists.find(p => p.id === draft.id);
                    if (target) {
                        target.name = name;
                        if (SUPPORTS_IDB) await dbPutMany("playlists", [target]);
                    }
                }
                renderAll();
            };
            inlineInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") { e.preventDefault(); commit(); }
                else if (e.key === "Escape") { inlinePlaylistDraft = null; renderPlaylists(); }
            });
            inlineInput.addEventListener("blur", commit);
        }
    }

    function getOrderedVisibleColumns() {
        return state.columnOrder
            .map(key => COLUMN_DEFS[key])
            .filter(col => col && (col.lockVisible || state.columns[col.key]));
    }

    function getColWidthStyle(col) {
        const custom = state.columnWidths && state.columnWidths[col.key];
        const w = typeof custom === "number" && custom >= col.minWidth ? custom : col.defaultWidth;
        return w ? `width:${Math.round(w)}px;` : "";
    }

    function renderTrackTable() {
        if (!dom) return;
        const visibleCols = getOrderedVisibleColumns();
        const list = getVisibleTracks();

        const colGroupHtml = visibleCols
            .map(c => `<col data-col-key="${c.key}" style="${getColWidthStyle(c)}" />`)
            .join("") + `<col data-col-key="actions" style="width:46px;" />`;
        dom.tableColGroup.innerHTML = colGroupHtml;

        const thHtml = visibleCols.map((c) => {
            const isSorted = state.sortBy === c.key;
            const arrow = isSorted ? (state.sortDir === "desc" ? " ▼" : " ▲") : "";
            return `<th class="mp-col-${c.key}" data-sort-col="${c.key}" title="Sort by ${c.label}">
                ${c.label}${arrow}
                <div class="mp-col-resizer" data-resize-col="${c.key}" title="Drag to resize column"></div>
            </th>`;
        }).join("") + `<th class="mp-col-actions"></th>`;
        dom.tableHead.innerHTML = `<tr>${thHtml}</tr>`;

        const totalSec = list.reduce((acc, t) => acc + (t.duration || 0), 0);
        dom.toolbarStatus.textContent = list.length
            ? `${list.length} track${list.length === 1 ? "" : "s"}${totalSec > 0 ? " · " + formatClock(totalSec) : ""}`
            : "0 tracks";

        if (!list.length) {
            dom.tableBody.innerHTML = "";
            dom.emptyState.classList.remove("hidden");
            dom.emptyTitle.textContent = tracks.length
                ? (searchQuery ? "No matching tracks" : "This playlist is empty")
                : "No local tracks added yet";
            dom.emptySub.textContent = tracks.length
                ? "Try clearing your filter or adding tracks via +."
                : "Drag audio files/folders here or use + Files / + Folder above. Zero upload.";
            return;
        }
        dom.emptyState.classList.add("hidden");

        const inCustomPlaylist = state.activePlaylistId !== "all";
        const rowsHtml = list.map((t) => {
            const activeCls = t.id === currentTrackId ? "is-playing" : "";
            const cells = visibleCols.map((c) => {
                const val = getTrackCellText(t, c.key);
                const cls = c.key === "title" ? "mp-cell-title" : `mp-col-${c.key}`;
                if (c.key === "trackNo" || c.key === "duration" || c.key === "codec" || c.key === "bitrate") {
                    return `<td class="${cls}" title="${escapeHtml(val)}">${escapeHtml(val)}</td>`;
                }
                return `<td class="${cls}" title="${escapeHtml(val)}"><div class="mp-cell-clip"><span class="mp-cell-text">${escapeHtml(val)}</span></div></td>`;
            }).join("");
            const actionBtn = inCustomPlaylist
                ? `<button type="button" class="mp-row-btn" data-remove-from-pl="${escapeHtml(t.id)}" title="Remove from playlist">−</button>`
                : `<button type="button" class="mp-row-btn" data-add-to-pl="${escapeHtml(t.id)}" title="Add to playlist">+</button>`;
            const delBtn = `<button type="button" class="mp-row-btn" data-delete-track="${escapeHtml(t.id)}" title="Remove from library">×</button>`;
            return `<tr data-tid="${escapeHtml(t.id)}" class="${activeCls}">${cells}<td class="mp-col-actions"><span class="mp-row-actions">${actionBtn}${delBtn}</span></td></tr>`;
        }).join("");

        dom.tableBody.innerHTML = rowsHtml;
    }

    function updateTrackCell(id, colKey, displayText) {
        if (!dom) return;
        const selector = colKey === "title"
            ? `tr[data-tid="${CSS.escape(id)}"] td.mp-cell-title`
            : `tr[data-tid="${CSS.escape(id)}"] td.mp-col-${colKey}`;
        const cell = dom.tableBody.querySelector(selector);
        if (cell) {
            const inner = cell.querySelector(".mp-cell-text");
            if (inner) inner.textContent = displayText;
            else cell.textContent = displayText;
            cell.title = displayText;
        }
    }

    function highlightPlayingRow() {
        if (!dom) return;
        dom.tableBody.querySelectorAll("tr").forEach((tr) => {
            tr.classList.toggle("is-playing", tr.dataset.tid === currentTrackId);
        });
    }

    function renderPreferences() {
        if (!dom || !dom.colList) return;
        const visibleCount = getOrderedVisibleColumns().length;
        dom.colList.innerHTML = state.columnOrder.map((key) => {
            const col = COLUMN_DEFS[key];
            if (!col) return "";
            const isChecked = !!state.columns[col.key];
            const checked = isChecked ? "checked" : "";
            const disabled = isChecked && visibleCount <= 1 ? "disabled" : "";
            return `
                <div class="mp-col-row" draggable="true" data-col-row="${col.key}">
                    <span class="mp-col-grip" title="Drag to reorder">⋮⋮</span>
                    <label class="mp-check-label">
                        <input type="checkbox" data-col-toggle="${col.key}" ${checked} ${disabled} />
                        <span>${col.label}</span>
                    </label>
                </div>
            `;
        }).join("");
    }

    function clearMarquee(clipEl, activeClass) {
        if (!clipEl) return;
        clipEl.classList.remove(activeClass);
        clipEl.style.removeProperty("--mp-scroll-dist");
        clipEl.style.removeProperty("--mp-scroll-dur");
        const inner = clipEl.querySelector(".mp-cell-text, .mp-marquee-text");
        if (inner) inner.removeAttribute("data-dup");
    }

    function applyMarqueeMeasure(clipEl, activeClass) {
        if (!clipEl) return;
        clearMarquee(clipEl, activeClass);
        const contentW = clipEl.scrollWidth;
        const boxW = clipEl.clientWidth;
        if (Math.ceil(contentW - boxW) > 2 && boxW > 16) {
            const inner = clipEl.querySelector(".mp-cell-text, .mp-marquee-text");
            if (inner) inner.setAttribute("data-dup", inner.textContent || "");
            const oneLoopPx = contentW + 36;
            const dur = Math.max(3.2, oneLoopPx / 42);
            clipEl.style.setProperty("--mp-scroll-dur", `${dur.toFixed(2)}s`);
            clipEl.classList.add(activeClass);
        }
    }

    function updateBottomMarquees() {
        if (!dom) return;
        if (state.mode === "minimized") {
            applyMarqueeMeasure(dom.miniTrack, "is-scrolling");
        } else if (state.mode === "expanded") {
            applyMarqueeMeasure(dom.npTitle, "is-scrolling");
            applyMarqueeMeasure(dom.npSub, "is-scrolling");
        }
    }

    function renderNowPlaying() {
        if (!dom) return;
        const trk = tracks.find(t => t.id === currentTrackId);
        const setMarqueeText = (clipEl, txt) => {
            if (!clipEl) return;
            const span = clipEl.querySelector(".mp-marquee-text");
            if (span) span.textContent = txt;
            else clipEl.textContent = txt;
            clipEl.title = txt;
        };

        if (!trk) {
            setMarqueeText(dom.npTitle, "No track selected");
            setMarqueeText(dom.npSub, "Double-click a track or press Play");
            setMarqueeText(dom.miniTrack, "No track loaded");
        } else {
            const artist = trk.artist || trk.albumArtist || "Unknown Artist";
            const extra = [artist, trk.album].filter(Boolean).join(" · ");
            setMarqueeText(dom.npTitle, trk.title || trk.fileName);
            setMarqueeText(dom.npSub, extra || trk.fileName);
            setMarqueeText(dom.miniTrack, `${trk.title || trk.fileName}${artist ? " — " + artist : ""}`);
        }
        renderPlayStateUI();
        updateTransportTimeUI();
        requestAnimationFrame(updateBottomMarquees);
    }

    function renderPlayStateUI() {
        if (!dom) return;
        dom.playBtn.innerHTML = isPlaying ? SVG.pause : SVG.play;
        dom.playBtn.classList.toggle("is-playing", isPlaying);
        dom.miniPlayBtn.innerHTML = isPlaying ? SVG.miniPause : SVG.miniPlay;
        dom.miniPlayBtn.classList.toggle("is-playing", isPlaying);

        dom.shuffleBtn.classList.toggle("is-active", !!state.shuffle);
        dom.repeatBtn.classList.toggle("is-active", state.repeat !== "off");
        dom.repeatBtn.innerHTML = state.repeat === "one" ? SVG.repeatOne : SVG.repeat;
        dom.repeatBtn.title = state.repeat === "one"
            ? "Repeat: One"
            : (state.repeat === "all" ? "Repeat: All" : "Repeat: Off");
    }

    function updateTransportTimeUI() {
        if (!dom) return;
        const cur = playerAudio && isFinite(playerAudio.currentTime) ? playerAudio.currentTime : 0;
        const trk = tracks.find(t => t.id === currentTrackId);
        const dur = (playerAudio && isFinite(playerAudio.duration) && playerAudio.duration > 0)
            ? playerAudio.duration
            : (trk && trk.duration ? trk.duration : 0);
        const pct = dur > 0 ? Math.max(0, Math.min(100, (cur / dur) * 100)) : 0;

        dom.seekSlider.value = pct;
        dom.miniSeekSlider.value = pct;
        dom.timeElapsed.textContent = formatElapsed(cur);
        dom.timeTotal.textContent = dur > 0 ? formatElapsed(dur) : "--:--";
        dom.miniTime.textContent = `${formatElapsed(cur)} / ${dur > 0 ? formatElapsed(dur) : "--:--"}`;
    }

    function syncVolumeUI(volState) {
        if (!dom) return;
        const st = volState || (window.mireAudioBridge ? window.mireAudioBridge.getVolume() : { volume: 70, effectiveVolume: 70, muted: false });
        const icon = st.muted ? SVG.muted : SVG.volume;
        const pctVal = Math.round(st.effectiveVolume || 0);
        dom.volBtn.innerHTML = icon;
        dom.volSlider.value = st.effectiveVolume;
        dom.volPct.textContent = `${pctVal}%`;
        dom.miniVolBtn.innerHTML = icon;
        dom.miniVolSlider.value = st.effectiveVolume;
    }

    function renderAll() {
        if (!mounted) return;
        renderReconnectButton();
        renderPlaylists();
        renderTrackTable();
        renderPreferences();
        renderNowPlaying();
        syncVolumeUI();
    }

    // ---------- DOM Mounting ----------
    function ensureMounted() {
        if (mounted) return;
        mounted = true;

        rootEl = document.createElement("aside");
        rootEl.id = "mire-music-player";
        rootEl.className = "hidden";
        rootEl.setAttribute("aria-label", "Music Player");

        const browserTip = SUPPORTS_FS_HANDLES
            ? `<p><strong>Library Persistence:</strong> Running on a Chromium browser—local file and folder references are saved cleanly in your browser across restarts without copying audio files.</p>`
            : `<p><strong>Best on Chrome / Chromium:</strong> File and folder persistence across restarts uses Chromium's local File System Handles. In this browser, tracks remain loaded for your current session only.</p>`;

        rootEl.innerHTML = `
            <div class="mp-resize-handle mp-resize-n" data-dir="n"></div>
            <div class="mp-resize-handle mp-resize-s" data-dir="s"></div>
            <div class="mp-resize-handle mp-resize-e" data-dir="e"></div>
            <div class="mp-resize-handle mp-resize-w" data-dir="w"></div>
            <div class="mp-resize-handle mp-resize-ne" data-dir="ne"></div>
            <div class="mp-resize-handle mp-resize-nw" data-dir="nw"></div>
            <div class="mp-resize-handle mp-resize-se" data-dir="se"></div>
            <div class="mp-resize-handle mp-resize-sw" data-dir="sw"></div>
            <div class="mp-resize-corner-grip" aria-hidden="true"></div>

            <div class="mp-frame">
                <!-- Expanded Header -->
                <div class="mp-header mp-expanded-only">
                    <div class="mp-title-group">
                        <span class="mp-title-icon">${SVG.note}</span>
                        <span class="mp-title-text">Music Player</span>
                    </div>
                    <div class="mp-header-actions">
                        <button type="button" class="mp-btn mp-reconnect-btn hidden" title="Restore read access or re-link saved tracks">Reconnect</button>
                        <button type="button" class="mp-btn mp-add-files-btn" title="Add local audio files">+ Files</button>
                        <button type="button" class="mp-btn mp-add-folder-btn" title="Scan a local music folder">+ Folder</button>
                        <button type="button" class="mp-icon-btn mp-info-btn" aria-expanded="false" title="Persistence & browser info">ⓘ</button>
                        <button type="button" class="mp-icon-btn mp-pref-btn" aria-expanded="false" title="Customize & reorder columns">${SVG.gear}</button>
                        <button type="button" class="mp-icon-btn mp-minimize-btn" title="Minimize to compact bar">${SVG.minimize}</button>
                        <button type="button" class="mp-icon-btn mp-close-btn" title="Close Music Player">${SVG.close}</button>

                        <div class="mp-popover mp-info-popover hidden" role="tooltip">
                            ${browserTip}
                            <p><strong>100% Local Playback:</strong> No audio is uploaded anywhere. All playback routes directly through MIRElink's EQ, Auto-Gain, and FFT analyzer.</p>
                        </div>

                        <div class="mp-popover mp-pref-popover hidden">
                            <div class="mp-pop-title">
                                <span>Columns</span>
                                <span class="mp-pop-sub">Drag to reorder</span>
                            </div>
                            <div class="mp-col-list"></div>
                            <div class="mp-pref-footer">
                                <button type="button" class="mp-btn mp-clear-lib-btn">Clear Library</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Toolbar -->
                <div class="mp-toolbar mp-expanded-only">
                    <div class="mp-search-wrap">
                        <input type="text" class="mp-search-input" placeholder="Search title, artist, album artist, album, codec..." />
                        <button type="button" class="mp-search-clear hidden" title="Clear search">×</button>
                    </div>
                    <span class="mp-toolbar-status">0 tracks</span>
                </div>

                <!-- Split Library Workspace -->
                <div class="mp-workspace mp-expanded-only">
                    <div class="mp-playlists">
                        <div class="mp-playlists-head">
                            <span>Playlists</span>
                            <button type="button" class="mp-playlist-mini-btn mp-new-pl-btn" title="Create playlist">+ New</button>
                        </div>
                        <div class="mp-playlists-list"></div>
                    </div>
                    <div class="mp-track-pane">
                        <div class="mp-track-scroll">
                            <table class="mp-table">
                                <colgroup></colgroup>
                                <thead></thead>
                                <tbody></tbody>
                            </table>
                            <div class="mp-empty-state">
                                <strong class="mp-empty-title">No local tracks added yet</strong>
                                <span class="mp-empty-sub">Drag audio files/folders here or use + Files / + Folder above. Zero upload.</span>
                            </div>
                        </div>
                        <div class="mp-drop-overlay hidden">Drop audio files or folders to add</div>
                    </div>
                </div>

                <!-- Expanded Transport -->
                <div class="mp-transport mp-expanded-only">
                    <div class="mp-seek-row">
                        <span class="mp-time-text mp-time-elapsed">00:00</span>
                        <input type="range" class="mp-range mp-seek-slider" min="0" max="100" step="0.1" value="0" aria-label="Seek track" />
                        <span class="mp-time-text mp-time-total">--:--</span>
                    </div>
                    <div class="mp-controls-row">
                        <div class="mp-now-playing-wrap">
                            <div class="mp-np-art" aria-hidden="true">
                                <img class="mp-np-art-img hidden" decoding="async" alt="" />
                                <span class="mp-np-art-fallback">${SVG.artFallback}</span>
                            </div>
                            <div class="mp-now-playing">
                                <div class="mp-np-title mp-marquee-clip"><span class="mp-marquee-text">No track selected</span></div>
                                <div class="mp-np-sub mp-marquee-clip"><span class="mp-marquee-text">Double-click a track or press Play</span></div>
                            </div>
                        </div>
                        <div class="mp-playback-btns">
                            <button type="button" class="mp-icon-btn mp-ctrl-btn mp-shuffle-btn" title="Shuffle">${SVG.shuffle}</button>
                            <button type="button" class="mp-icon-btn mp-ctrl-btn mp-transport-step mp-prev-btn" title="Previous">${SVG.prev}</button>
                            <button type="button" class="mp-play-main mp-play-btn" title="Play / Pause">${SVG.play}</button>
                            <button type="button" class="mp-icon-btn mp-ctrl-btn mp-transport-step mp-next-btn" title="Next">${SVG.next}</button>
                            <button type="button" class="mp-icon-btn mp-ctrl-btn mp-repeat-btn" title="Repeat">${SVG.repeat}</button>
                        </div>
                        <div class="mp-volume-wrap">
                            <button type="button" class="mp-icon-btn mp-vol-btn" title="Mute / Unmute">${SVG.volume}</button>
                            <input type="range" class="mp-range mp-vol-slider" min="0" max="100" step="0.5" value="70" aria-label="Master Volume" />
                            <span class="mp-vol-pct">70%</span>
                        </div>
                    </div>
                </div>

                <!-- Minimized Transport Bar -->
                <div class="mp-mini-bar mp-minimized-only">
                    <div class="mp-mini-top">
                        <div class="mp-mini-track mp-marquee-clip"><span class="mp-marquee-text">No track loaded</span></div>
                        <div class="mp-mini-controls">
                            <button type="button" class="mp-icon-btn mp-mini-prev" title="Previous">${SVG.prev}</button>
                            <button type="button" class="mp-icon-btn mp-mini-play" title="Play / Pause">${SVG.miniPlay}</button>
                            <button type="button" class="mp-icon-btn mp-mini-next" title="Next">${SVG.next}</button>
                            <button type="button" class="mp-icon-btn mp-mini-vol" title="Mute / Unmute">${SVG.volume}</button>
                            <input type="range" class="mp-range mp-vol-slider mp-mini-vol-slider" min="0" max="100" step="0.5" value="70" aria-label="Volume" style="width:48px;flex-basis:48px;" />
                            <button type="button" class="mp-icon-btn mp-expand-btn" title="Expand Music Player">${SVG.expand}</button>
                            <button type="button" class="mp-icon-btn mp-close-btn mp-mini-close" title="Close Music Player">${SVG.close}</button>
                        </div>
                    </div>
                    <div class="mp-mini-bottom">
                        <input type="range" class="mp-range mp-mini-seek" min="0" max="100" step="0.1" value="0" aria-label="Seek track" />
                        <span class="mp-time-text mp-mini-time">00:00 / --:--</span>
                    </div>
                </div>
            </div>

            <div class="mp-playlist-picker hidden"></div>
            <input type="file" class="mp-file-input" multiple accept="audio/*" style="display:none" />
            <input type="file" class="mp-folder-input" webkitdirectory multiple accept="audio/*" style="display:none" />
            <input type="file" class="mp-relink-file-input" multiple accept="audio/*" style="display:none" />
            <input type="file" class="mp-relink-folder-input" webkitdirectory multiple accept="audio/*" style="display:none" />
        `;

        document.body.appendChild(rootEl);

        dom = {
            header: rootEl.querySelector(".mp-header"),
            miniTop: rootEl.querySelector(".mp-mini-top"),
            reconnectBtn: rootEl.querySelector(".mp-reconnect-btn"),
            addFilesBtn: rootEl.querySelector(".mp-add-files-btn"),
            addFolderBtn: rootEl.querySelector(".mp-add-folder-btn"),
            infoBtn: rootEl.querySelector(".mp-info-btn"),
            infoPopover: rootEl.querySelector(".mp-info-popover"),
            prefBtn: rootEl.querySelector(".mp-pref-btn"),
            prefPopover: rootEl.querySelector(".mp-pref-popover"),
            colList: rootEl.querySelector(".mp-col-list"),
            clearLibBtn: rootEl.querySelector(".mp-clear-lib-btn"),
            minimizeBtn: rootEl.querySelector(".mp-minimize-btn"),
            expandBtn: rootEl.querySelector(".mp-expand-btn"),
            closeBtn: rootEl.querySelector(".mp-close-btn"),
            miniCloseBtn: rootEl.querySelector(".mp-mini-close"),
            searchInput: rootEl.querySelector(".mp-search-input"),
            searchClear: rootEl.querySelector(".mp-search-clear"),
            toolbarStatus: rootEl.querySelector(".mp-toolbar-status"),
            newPlBtn: rootEl.querySelector(".mp-new-pl-btn"),
            playlistsList: rootEl.querySelector(".mp-playlists-list"),
            tableEl: rootEl.querySelector("table.mp-table"),
            tableColGroup: rootEl.querySelector("table.mp-table colgroup"),
            tableHead: rootEl.querySelector("table.mp-table thead"),
            tableBody: rootEl.querySelector("table.mp-table tbody"),
            emptyState: rootEl.querySelector(".mp-empty-state"),
            emptyTitle: rootEl.querySelector(".mp-empty-title"),
            emptySub: rootEl.querySelector(".mp-empty-sub"),
            trackPane: rootEl.querySelector(".mp-track-pane"),
            dropOverlay: rootEl.querySelector(".mp-drop-overlay"),
            timeElapsed: rootEl.querySelector(".mp-time-elapsed"),
            timeTotal: rootEl.querySelector(".mp-time-total"),
            seekSlider: rootEl.querySelector(".mp-seek-slider"),
            nowPlayingWrap: rootEl.querySelector(".mp-now-playing-wrap"),
            npArtImg: rootEl.querySelector(".mp-np-art-img"),
            npArtFallback: rootEl.querySelector(".mp-np-art-fallback"),
            npTitle: rootEl.querySelector(".mp-np-title"),
            npSub: rootEl.querySelector(".mp-np-sub"),
            shuffleBtn: rootEl.querySelector(".mp-shuffle-btn"),
            prevBtn: rootEl.querySelector(".mp-prev-btn"),
            playBtn: rootEl.querySelector(".mp-play-btn"),
            nextBtn: rootEl.querySelector(".mp-next-btn"),
            repeatBtn: rootEl.querySelector(".mp-repeat-btn"),
            volBtn: rootEl.querySelector(".mp-vol-btn"),
            volSlider: rootEl.querySelector(".mp-vol-slider"),
            volPct: rootEl.querySelector(".mp-vol-pct"),
            miniTrack: rootEl.querySelector(".mp-mini-track"),
            miniPrevBtn: rootEl.querySelector(".mp-mini-prev"),
            miniPlayBtn: rootEl.querySelector(".mp-mini-play"),
            miniNextBtn: rootEl.querySelector(".mp-mini-next"),
            miniVolBtn: rootEl.querySelector(".mp-mini-vol"),
            miniVolSlider: rootEl.querySelector(".mp-mini-vol-slider"),
            miniSeekSlider: rootEl.querySelector(".mp-mini-seek"),
            miniTime: rootEl.querySelector(".mp-mini-time"),
            playlistPicker: rootEl.querySelector(".mp-playlist-picker"),
            fileInput: rootEl.querySelector(".mp-file-input"),
            folderInput: rootEl.querySelector(".mp-folder-input"),
            relinkFileInput: rootEl.querySelector(".mp-relink-file-input"),
            relinkFolderInput: rootEl.querySelector(".mp-relink-folder-input")
        };

        wireEvents();
        initDragAndResize();
        if (typeof ResizeObserver !== "undefined" && dom.nowPlayingWrap) {
            const ro = new ResizeObserver(() => updateBottomMarquees());
            ro.observe(dom.nowPlayingWrap);
            if (dom.miniTop) ro.observe(dom.miniTop);
        }
        if (window.mireAudioBridge && typeof window.mireAudioBridge.subscribeVolume === "function" && !unsubVolume) {
            unsubVolume = window.mireAudioBridge.subscribeVolume(syncVolumeUI);
        }
        renderAll();
    }

    function wireColumnDragReorder() {
        let dragColKey = null;

        const clearIndicators = () => {
            dom.colList.querySelectorAll(".mp-col-row").forEach((el) => {
                el.classList.remove("is-dragging-row", "is-drop-before", "is-drop-after");
            });
        };

        dom.colList.addEventListener("dragstart", (e) => {
            if (e.target.closest("input")) {
                e.preventDefault();
                return;
            }
            const row = e.target.closest(".mp-col-row[data-col-row]");
            if (!row) return;
            dragColKey = row.dataset.colRow;
            row.classList.add("is-dragging-row");
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", dragColKey);
            }
        });

        dom.colList.addEventListener("dragover", (e) => {
            if (!dragColKey) return;
            e.preventDefault();
            const target = e.target.closest(".mp-col-row[data-col-row]");
            clearIndicators();
            const draggingEl = dom.colList.querySelector(`.mp-col-row[data-col-row="${dragColKey}"]`);
            if (draggingEl) draggingEl.classList.add("is-dragging-row");
            if (!target || target.dataset.colRow === dragColKey) return;
            const rect = target.getBoundingClientRect();
            const before = e.clientY < rect.top + rect.height / 2;
            target.classList.add(before ? "is-drop-before" : "is-drop-after");
        });

        dom.colList.addEventListener("drop", (e) => {
            if (!dragColKey) return;
            e.preventDefault();
            const target = e.target.closest(".mp-col-row[data-col-row]");
            if (target && target.dataset.colRow !== dragColKey) {
                const targetKey = target.dataset.colRow;
                const rect = target.getBoundingClientRect();
                const insertBefore = e.clientY < rect.top + rect.height / 2;
                const nextOrder = state.columnOrder.filter(k => k !== dragColKey);
                let targetIdx = nextOrder.indexOf(targetKey);
                if (!insertBefore) targetIdx += 1;
                nextOrder.splice(Math.max(0, targetIdx), 0, dragColKey);
                state.columnOrder = nextOrder;
                saveState();
                renderPreferences();
                renderTrackTable();
            }
            dragColKey = null;
            clearIndicators();
        });

        dom.colList.addEventListener("dragend", () => {
            dragColKey = null;
            clearIndicators();
        });
    }

    function wireTableColumnResize() {
        let activeResize = null;
        let suppressHeaderClick = false;

        dom.tableHead.addEventListener("pointerdown", (e) => {
            const resizer = e.target.closest(".mp-col-resizer[data-resize-col]");
            if (!resizer || e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();

            const colKey = resizer.dataset.resizeCol;
            const th = resizer.closest("th");
            const colEl = dom.tableColGroup.querySelector(`col[data-col-key="${colKey}"]`);
            if (!th || !colEl) return;

            th.classList.add("is-col-resizing");
            activeResize = {
                colKey,
                th,
                colEl,
                startX: e.clientX,
                startWidth: th.getBoundingClientRect().width,
                minWidth: (COLUMN_DEFS[colKey] && COLUMN_DEFS[colKey].minWidth) || 44
            };

            const onMove = (mv) => {
                if (!activeResize) return;
                const nextW = Math.max(activeResize.minWidth, Math.round(activeResize.startWidth + (mv.clientX - activeResize.startX)));
                activeResize.colEl.style.width = `${nextW}px`;
                state.columnWidths[activeResize.colKey] = nextW;
            };

            const onUp = () => {
                if (!activeResize) return;
                activeResize.th.classList.remove("is-col-resizing");
                activeResize = null;
                suppressHeaderClick = true;
                setTimeout(() => { suppressHeaderClick = false; }, 80);
                saveState();
                document.removeEventListener("pointermove", onMove);
                document.removeEventListener("pointerup", onUp);
            };

            document.addEventListener("pointermove", onMove);
            document.addEventListener("pointerup", onUp);
        });

        dom.tableHead.addEventListener("click", (e) => {
            if (suppressHeaderClick || e.target.closest(".mp-col-resizer")) return;
            const th = e.target.closest("th[data-sort-col]");
            if (!th) return;
            const col = th.dataset.sortCol;
            if (state.sortBy === col) {
                state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
            } else {
                state.sortBy = col;
                state.sortDir = "asc";
            }
            saveState();
            renderTrackTable();
        });
    }

    function wireEvents() {
        dom.addFilesBtn.addEventListener("click", handleAddFilesClick);
        dom.addFolderBtn.addEventListener("click", handleAddFolderClick);
        dom.reconnectBtn.addEventListener("click", reconnectLibraryPermissions);

        dom.fileInput.addEventListener("change", async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) await ingestTrackEntries(files.map(f => ({ file: f, relativePath: f.name })));
            e.target.value = "";
        });

        dom.folderInput.addEventListener("change", async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) {
                await ingestTrackEntries(files.map(f => ({ file: f, relativePath: f.webkitRelativePath || f.name })));
            }
            e.target.value = "";
        });

        dom.relinkFileInput.addEventListener("change", async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) {
                await relinkEntriesToExistingTracks(files.map(f => ({ file: f, relativePath: f.name })));
            }
            e.target.value = "";
        });

        dom.relinkFolderInput.addEventListener("change", async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length) {
                await relinkEntriesToExistingTracks(files.map(f => ({ file: f, relativePath: f.webkitRelativePath || f.name })));
            }
            e.target.value = "";
        });

        dom.minimizeBtn.addEventListener("click", () => setMode("minimized"));
        dom.expandBtn.addEventListener("click", () => setMode("expanded"));
        dom.closeBtn.addEventListener("click", () => setMode("closed"));
        dom.miniCloseBtn.addEventListener("click", () => setMode("closed"));

        dom.prefBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const open = dom.prefPopover.classList.contains("hidden");
            closeAllPopovers();
            dom.prefPopover.classList.toggle("hidden", !open);
            dom.prefBtn.setAttribute("aria-expanded", open ? "true" : "false");
        });

        dom.infoBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const open = dom.infoPopover.classList.contains("hidden");
            closeAllPopovers();
            dom.infoPopover.classList.toggle("hidden", !open);
            dom.infoBtn.setAttribute("aria-expanded", open ? "true" : "false");
        });

        document.addEventListener("click", (e) => {
            if (!dom) return;
            if (!dom.prefPopover.contains(e.target) && !dom.prefBtn.contains(e.target)) {
                dom.prefPopover.classList.add("hidden");
                dom.prefBtn.setAttribute("aria-expanded", "false");
            }
            if (!dom.infoPopover.contains(e.target) && !dom.infoBtn.contains(e.target)) {
                dom.infoPopover.classList.add("hidden");
                dom.infoBtn.setAttribute("aria-expanded", "false");
            }
            if (!dom.playlistPicker.contains(e.target) && !e.target.closest("[data-add-to-pl]")) {
                dom.playlistPicker.classList.add("hidden");
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && dom) closeAllPopovers();
        });

        // Column visibility checkboxes & drag-and-drop column order
        dom.colList.addEventListener("change", (e) => {
            const cb = e.target.closest("input[data-col-toggle]");
            if (cb) {
                const key = cb.dataset.colToggle;
                const enabledAfter = Object.keys(COLUMN_DEFS).filter(k => k === key ? cb.checked : state.columns[k]);
                if (!enabledAfter.length) {
                    cb.checked = true;
                    return;
                }
                state.columns[key] = cb.checked;
                saveState();
                renderPreferences();
                renderTrackTable();
            }
        });
        wireColumnDragReorder();
        wireTableColumnResize();

        // Hover horizontal scroll on truncated playlist cells
        let activeHoverClip = null;
        dom.tableBody.addEventListener("pointerover", (e) => {
            const td = e.target.closest("td");
            const clip = td ? td.querySelector(".mp-cell-clip") : null;
            if (clip === activeHoverClip) return;
            if (activeHoverClip) {
                clearMarquee(activeHoverClip, "is-hover-scroll");
                activeHoverClip = null;
            }
            if (clip) {
                activeHoverClip = clip;
                applyMarqueeMeasure(clip, "is-hover-scroll");
            }
        });
        dom.tableBody.addEventListener("pointerleave", () => {
            if (activeHoverClip) {
                clearMarquee(activeHoverClip, "is-hover-scroll");
                activeHoverClip = null;
            }
        });

        dom.clearLibBtn.addEventListener("click", async () => {
            stopPlayback();
            clearActiveCoverArt();
            tracks = [];
            playlists = [];
            folderHandles = [];
            sessionFiles.clear();
            currentTrackId = null;
            needsPermissionReconnect = false;
            state.activePlaylistId = "all";
            saveState();
            if (SUPPORTS_IDB) await dbClearAll();
            closeAllPopovers();
            renderAll();
            notify("Cleared Music Player library.");
        });

        // Search
        dom.searchInput.addEventListener("input", () => {
            searchQuery = dom.searchInput.value;
            dom.searchClear.classList.toggle("hidden", !searchQuery);
            renderTrackTable();
        });
        dom.searchClear.addEventListener("click", () => {
            searchQuery = "";
            dom.searchInput.value = "";
            dom.searchClear.classList.add("hidden");
            renderTrackTable();
        });

        // Playlist sidebar actions
        dom.newPlBtn.addEventListener("click", () => {
            inlinePlaylistDraft = { mode: "create" };
            renderPlaylists();
        });

        dom.playlistsList.addEventListener("click", async (e) => {
            const renBtn = e.target.closest("[data-pl-rename]");
            if (renBtn) {
                e.stopPropagation();
                inlinePlaylistDraft = { mode: "rename", id: renBtn.dataset.plRename };
                renderPlaylists();
                return;
            }
            const delBtn = e.target.closest("[data-pl-delete]");
            if (delBtn) {
                e.stopPropagation();
                const pid = delBtn.dataset.plDelete;
                playlists = playlists.filter(p => p.id !== pid);
                if (state.activePlaylistId === pid) state.activePlaylistId = "all";
                saveState();
                if (SUPPORTS_IDB) await dbDelete("playlists", pid);
                renderAll();
                return;
            }
            const item = e.target.closest(".mp-playlist-item[data-pid]");
            if (item && !e.target.closest(".mp-pl-inline-input")) {
                state.activePlaylistId = item.dataset.pid;
                saveState();
                renderAll();
            }
        });

        dom.tableBody.addEventListener("dblclick", (e) => {
            if (e.target.closest("button")) return;
            const tr = e.target.closest("tr[data-tid]");
            if (tr) playTrackById(tr.dataset.tid);
        });

        dom.tableBody.addEventListener("click", async (e) => {
            const addBtn = e.target.closest("[data-add-to-pl]");
            if (addBtn) {
                e.stopPropagation();
                openPlaylistPicker(addBtn.dataset.addToPl, addBtn);
                return;
            }
            const remBtn = e.target.closest("[data-remove-from-pl]");
            if (remBtn) {
                e.stopPropagation();
                const tid = remBtn.dataset.removeFromPl;
                const pl = playlists.find(p => p.id === state.activePlaylistId);
                if (pl) {
                    pl.trackIds = pl.trackIds.filter(id => id !== tid);
                    if (SUPPORTS_IDB) await dbPutMany("playlists", [pl]);
                    renderAll();
                }
                return;
            }
            const delBtn = e.target.closest("[data-delete-track]");
            if (delBtn) {
                e.stopPropagation();
                const tid = delBtn.dataset.deleteTrack;
                if (tid === currentTrackId) {
                    stopPlayback();
                    clearActiveCoverArt();
                    currentTrackId = null;
                }
                tracks = tracks.filter(t => t.id !== tid);
                sessionFiles.delete(tid);
                playlists.forEach(pl => {
                    pl.trackIds = pl.trackIds.filter(id => id !== tid);
                });
                if (SUPPORTS_IDB) {
                    await dbDelete("tracks", tid);
                    await dbPutMany("playlists", playlists);
                }
                needsPermissionReconnect = await computeNeedsReconnect();
                renderAll();
            }
        });

        // Drag & drop audio files/folders onto track pane
        let dragDepth = 0;
        dom.trackPane.addEventListener("dragenter", (e) => {
            e.preventDefault();
            dragDepth++;
            dom.dropOverlay.classList.remove("hidden");
        });
        dom.trackPane.addEventListener("dragover", (e) => {
            e.preventDefault();
        });
        dom.trackPane.addEventListener("dragleave", () => {
            dragDepth = Math.max(0, dragDepth - 1);
            if (!dragDepth) dom.dropOverlay.classList.add("hidden");
        });
        dom.trackPane.addEventListener("drop", async (e) => {
            e.preventDefault();
            dragDepth = 0;
            dom.dropOverlay.classList.add("hidden");
            await handleDropTransfer(e.dataTransfer);
        });

        // Transport controls (Expanded + Mini)
        dom.playBtn.addEventListener("click", togglePlayPause);
        dom.miniPlayBtn.addEventListener("click", togglePlayPause);
        dom.prevBtn.addEventListener("click", playPrevTrack);
        dom.miniPrevBtn.addEventListener("click", playPrevTrack);
        dom.nextBtn.addEventListener("click", () => playNextTrack(false));
        dom.miniNextBtn.addEventListener("click", () => playNextTrack(false));

        dom.shuffleBtn.addEventListener("click", () => {
            state.shuffle = !state.shuffle;
            saveState();
            renderPlayStateUI();
        });

        dom.repeatBtn.addEventListener("click", () => {
            state.repeat = state.repeat === "off" ? "all" : (state.repeat === "all" ? "one" : "off");
            saveState();
            renderPlayStateUI();
        });

        const wireSeekSlider = (slider) => {
            slider.addEventListener("pointerdown", () => { isSeeking = true; });
            slider.addEventListener("pointerup", () => { isSeeking = false; });
            slider.addEventListener("input", () => {
                if (!playerAudio || !isFinite(playerAudio.duration) || playerAudio.duration <= 0) return;
                playerAudio.currentTime = (parseFloat(slider.value) / 100) * playerAudio.duration;
                updateTransportTimeUI();
            });
            slider.addEventListener("change", () => { isSeeking = false; });
        };
        wireSeekSlider(dom.seekSlider);
        wireSeekSlider(dom.miniSeekSlider);

        const wireVol = (btn, slider) => {
            btn.addEventListener("click", () => {
                window.mireAudioBridge?.toggleMute();
            });
            slider.addEventListener("input", () => {
                window.mireAudioBridge?.setVolume(slider.value);
            });
        };
        wireVol(dom.volBtn, dom.volSlider);
        wireVol(dom.miniVolBtn, dom.miniVolSlider);
    }

    function openPlaylistPicker(trackId, anchorEl) {
        if (!playlists.length) {
            notify("Create a playlist using + New first.");
            return;
        }
        const rect = anchorEl.getBoundingClientRect();
        dom.playlistPicker.innerHTML = playlists.map((pl) => {
            const exists = pl.trackIds.includes(trackId);
            return `<button type="button" class="mp-picker-opt" data-pick-pl="${escapeHtml(pl.id)}" data-pick-trk="${escapeHtml(trackId)}">${exists ? "✓ " : "+ "}${escapeHtml(pl.name)}</button>`;
        }).join("");

        dom.playlistPicker.classList.remove("hidden");
        const pickerRect = dom.playlistPicker.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.right - pickerRect.width, window.innerWidth - pickerRect.width - 8));
        const top = Math.min(rect.bottom + 4, window.innerHeight - pickerRect.height - 8);
        dom.playlistPicker.style.left = `${Math.round(left)}px`;
        dom.playlistPicker.style.top = `${Math.round(top)}px`;

        dom.playlistPicker.onclick = async (ev) => {
            const opt = ev.target.closest("[data-pick-pl]");
            if (!opt) return;
            const pid = opt.dataset.pickPl;
            const tid = opt.dataset.pickTrk;
            const pl = playlists.find(p => p.id === pid);
            if (pl) {
                if (pl.trackIds.includes(tid)) pl.trackIds = pl.trackIds.filter(id => id !== tid);
                else pl.trackIds.push(tid);
                if (SUPPORTS_IDB) await dbPutMany("playlists", [pl]);
                renderPlaylists();
                if (state.activePlaylistId === pid) renderTrackTable();
            }
            dom.playlistPicker.classList.add("hidden");
        };
    }

    // ---------- Public API & Viewport Guard ----------
    window.openMusicPlayer = function (mode = "expanded") {
        if (!isDesktop()) {
            notify("Music Player works on desktop only.");
            return;
        }
        setMode(mode === "minimized" ? "minimized" : "expanded");
        if (typeof window.trackFeatureUsed === "function") {
            window.trackFeatureUsed("music_player_opened");
        }
    };

    window.closeMusicPlayer = function () {
        if (!mounted) return;
        setMode("closed");
    };

    window.toggleMusicPlayer = function () {
        if (!isDesktop()) {
            notify("Music Player works on desktop only.");
            return;
        }
        if (!mounted || state.mode === "closed") {
            setMode(state.mode === "minimized" ? "minimized" : "expanded");
            if (typeof window.trackFeatureUsed === "function") {
                window.trackFeatureUsed("music_player_opened");
            }
        } else {
            setMode("closed");
        }
    };

    window.addEventListener("resize", () => {
        if (!mounted || state.mode === "closed") return;
        if (!isDesktop()) {
            stopPlayback();
            rootEl.classList.add("hidden");
            const launcherBtn = document.getElementById("open-music-player");
            if (launcherBtn) launcherBtn.classList.remove("selected");
            return;
        }
        rootEl.classList.remove("hidden");
        applyGeometry();
    });

    const boot = async () => {
        await hydrateChromiumLibrary();
        if (isDesktop() && (state.mode === "expanded" || state.mode === "minimized")) {
            setMode(state.mode);
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot);
    } else {
        boot();
    }
})();
