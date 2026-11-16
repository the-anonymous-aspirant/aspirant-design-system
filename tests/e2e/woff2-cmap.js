// The Unicode coverage of a WOFF2 font, read from its own cmap with Node's
// built-in brotli (no font library). It reads the shipped file, not a copy:
// system_3 #11151 checks every registered icon glyph against the house
// typeface with it. Format 4 and format 12 subtables; a WOFF2 cmap is never
// transformed, so it is the raw table once the stream is decompressed.

import { readFileSync } from 'node:fs'
import { brotliDecompressSync } from 'node:zlib'

const KNOWN = ['cmap','head','hhea','hmtx','maxp','name','OS/2','post','cvt ','fpgm','glyf','loca','prep','CFF ','VORG','EBDT','EBLC','gasp','hdmx','kern','LTSH','PCLT','VDMX','vhea','vmtx','BASE','GDEF','GPOS','GSUB','EBSC','JSTF','MATH','CBDT','CBLC','COLR','CPAL','SVG ','sbix','acnt','avar','bdat','bloc','bsln','cvar','fdsc','feat','fmtx','fvar','gvar','hsty','just','lcar','mort','morx','opbd','prop','trak','Zapf','Silf','Glat','Gloc','Feat','Sill']

export function woff2Codepoints(path) {
  const b = readFileSync(path)
  if (b.toString('latin1', 0, 4) !== 'wOF2') throw new Error('not WOFF2')
  const numTables = b.readUInt16BE(12)
  const totalCompressed = b.readUInt32BE(20)
  let p = 48
  const base128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const x = b[p++]; v = (v * 128) + (x & 0x7f); if (!(x & 0x80)) return v } throw new Error('bad UIntBase128') }
  const tables = []
  for (let i = 0; i < numTables; i++) {
    const flags = b[p++]
    let tag = KNOWN[flags & 0x3f]
    if ((flags & 0x3f) === 63) { tag = b.toString('latin1', p, p + 4); p += 4 }
    const version = flags >> 6
    const orig = base128()
    const transformed = (tag === 'glyf' || tag === 'loca') ? version === 0 : version !== 0
    const len = transformed ? base128() : orig
    tables.push({ tag, len })
  }
  const data = brotliDecompressSync(b.subarray(p, p + totalCompressed))
  let off = 0
  let cmap = null
  for (const t of tables) { if (t.tag === 'cmap') cmap = data.subarray(off, off + t.len); off += t.len }
  if (!cmap) throw new Error('no cmap')
  const n = cmap.readUInt16BE(2)
  const cps = new Set()
  for (let i = 0; i < n; i++) {
    const plat = cmap.readUInt16BE(4 + i * 8), enc = cmap.readUInt16BE(6 + i * 8), so = cmap.readUInt32BE(8 + i * 8)
    const fmt = cmap.readUInt16BE(so)
    if (fmt === 4 && (plat === 0 || (plat === 3 && enc === 1))) {
      const segX2 = cmap.readUInt16BE(so + 6), seg = segX2 / 2
      const ends = so + 14, starts = ends + segX2 + 2, deltas = starts + segX2, ranges = deltas + segX2
      for (let s = 0; s < seg; s++) {
        const end = cmap.readUInt16BE(ends + 2 * s), start = cmap.readUInt16BE(starts + 2 * s)
        const delta = cmap.readInt16BE(deltas + 2 * s), ro = cmap.readUInt16BE(ranges + 2 * s)
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let g
          if (ro === 0) g = (c + delta) & 0xffff
          else { const gi = ranges + 2 * s + ro + 2 * (c - start); g = cmap.readUInt16BE(gi); if (g) g = (g + delta) & 0xffff }
          if (g) cps.add(c)
        }
      }
    } else if (fmt === 12 && (plat === 0 || (plat === 3 && enc === 10))) {
      const groups = cmap.readUInt32BE(so + 12)
      for (let g = 0; g < groups; g++) {
        const st = cmap.readUInt32BE(so + 16 + g * 12), en = cmap.readUInt32BE(so + 20 + g * 12)
        for (let c = st; c <= en; c++) cps.add(c)
      }
    }
  }
  return cps
}
