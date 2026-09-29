import zlib from "node:zlib";

// Node writes the host OS into the gzip header: 0x13 on macOS, 0x03 on Linux.
// The deflate body matches across those hosts on the Node 22 zlib used in CI.
// Pin the byte already stored in styles.css, and pin mtime, so a Linux rebuild
// does not rewrite the dictionary line.
const GZIP_OS_MACOS = 0x13;

export function gzipDictionary(source) {
  const payload = zlib.gzipSync(source, { level: 9, mtime: 0 });
  payload[9] = GZIP_OS_MACOS;
  return payload;
}
