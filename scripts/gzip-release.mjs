import zlib from "node:zlib";

export function gzipForRelease(buffer) {
  const gzip = zlib.gzipSync(buffer, { level: 9, mtime: 0 });
  // Node writes the host OS into gzip byte 9. macOS and Ubuntu CI then
  // disagree, and a one-line diff of the dictionary payload stalls CI.
  gzip[9] = 255;
  return gzip;
}
