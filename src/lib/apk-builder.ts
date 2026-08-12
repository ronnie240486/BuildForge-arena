import { createHash } from "crypto";

/* -------------------------------------------------------------------------- */
/*  Binary AndroidManifest (AXML) generator                                    */
/*                                                                             */
/*  Android does NOT read a plain-text AndroidManifest.xml inside an APK — it  */
/*  expects the compiled binary XML (AXML) format produced by aapt2. We emit a */
/*  minimal, spec-correct AXML so package parsers can at least read the        */
/*  package name, versionCode and a launcher activity.                         */
/* -------------------------------------------------------------------------- */

class ByteWriter {
  private chunks: Buffer[] = [];
  u16(v: number) {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(v & 0xffff, 0);
    this.chunks.push(b);
  }
  u32(v: number) {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(v >>> 0, 0);
    this.chunks.push(b);
  }
  raw(b: Buffer) {
    this.chunks.push(b);
  }
  get length() {
    return this.chunks.reduce((a, c) => a + c.length, 0);
  }
  toBuffer() {
    return Buffer.concat(this.chunks);
  }
}

// AXML string pool uses UTF-16LE length-prefixed strings, each null-terminated.
function encodeStringPool(strings: string[]): Buffer {
  const CHUNK_TYPE = 0x0001;
  const offsets: number[] = [];
  const data = new ByteWriter();
  for (const s of strings) {
    offsets.push(data.length);
    const len = s.length;
    // length prefix (UTF-16)
    const lb = Buffer.alloc(2);
    lb.writeUInt16LE(len, 0);
    data.raw(lb);
    data.raw(Buffer.from(s, "utf16le"));
    data.raw(Buffer.from([0x00, 0x00])); // null terminator
  }
  // pad string data to 4 bytes
  let strData = data.toBuffer();
  while (strData.length % 4 !== 0) strData = Buffer.concat([strData, Buffer.from([0x00])]);

  const stringCount = strings.length;
  const headerSize = 28;
  const offsetsSize = stringCount * 4;
  const stringsStart = headerSize + offsetsSize;
  const chunkSize = stringsStart + strData.length;

  const w = new ByteWriter();
  w.u16(CHUNK_TYPE); // type
  w.u16(headerSize); // header size
  w.u32(chunkSize); // chunk size
  w.u32(stringCount); // string count
  w.u32(0); // style count
  w.u32(1 << 8); // flags: UTF-16 (SORTED=0, UTF8_FLAG not set)
  w.u32(stringsStart); // strings start
  w.u32(0); // styles start
  for (const off of offsets) w.u32(off);
  w.raw(strData);
  return w.toBuffer();
}

const RES_XML_TYPE = 0x0003;
const RES_XML_START_NS = 0x0100;
const RES_XML_END_NS = 0x0101;
const RES_XML_START_ELEM = 0x0102;
const RES_XML_END_ELEM = 0x0103;

function buildAxml(packageName: string, label: string, versionName: string): Buffer {
  // String pool indices
  const strings = [
    "android", // 0 ns prefix
    "http://schemas.android.com/apk/res/android", // 1 ns uri
    "manifest", // 2
    "package", // 3
    "versionCode", // 4
    "versionName", // 5
    "application", // 6
    "label", // 7
    "activity", // 8
    "name", // 9
    ".MainActivity", // 10
    packageName, // 11
    label, // 12
    versionName, // 13
  ];
  const S = {
    androidNs: 0,
    androidUri: 1,
    manifest: 2,
    pkg: 3,
    versionCode: 4,
    versionName: 5,
    application: 6,
    label: 7,
    activity: 8,
    name: 9,
    mainActivity: 10,
    pkgVal: 11,
    labelVal: 12,
    versionNameVal: 13,
  };

  const pool = encodeStringPool(strings);

  // Resource map (maps attribute name indices to resource IDs). Minimal.
  const resMap = new ByteWriter();
  const RES_MAP_TYPE = 0x0180;
  const ids = [0x0101021b /*versionCode*/, 0x0101021c /*versionName*/, 0x01010001 /*label*/, 0x01010003 /*name*/];
  resMap.u16(RES_MAP_TYPE);
  resMap.u16(8);
  resMap.u32(8 + ids.length * 4);
  for (const id of ids) resMap.u32(id);

  const body = new ByteWriter();

  const writeNode = (fn: (w: ByteWriter) => void) => fn(body);

  // TypedValue: string reference
  const strVal = (idx: number) => {
    const v = new ByteWriter();
    v.u16(8); // size
    v.u16(0); // res0
    v.u16(0x0300); // TYPE_STRING? actually 0x03 in high byte -> dataType STRING = 0x03
    // Correct layout: size(2), res0(1)+dataType(1), data(4). Rebuild:
    return v; // placeholder (not used — see attr writer below)
  };
  void strVal;

  // startNamespace
  writeNode((w) => {
    w.u16(RES_XML_START_NS);
    w.u16(16);
    w.u32(24);
    w.u32(1); // lineNumber
    w.u32(0xffffffff); // comment
    w.u32(S.androidNs);
    w.u32(S.androidUri);
  });

  // Helper to write an attribute (20 bytes each)
  const attr = (w: ByteWriter, nsIdx: number, nameIdx: number, rawValueIdx: number, dataType: number, data: number) => {
    w.u32(nsIdx); // ns
    w.u32(nameIdx); // name
    w.u32(rawValueIdx); // raw value (string index or -1)
    w.u16(8); // typed value size
    w.u16(dataType << 8); // res0(0) + dataType
    w.u32(data); // data
  };

  const startElem = (w: ByteWriter, nsIdx: number, nameIdx: number, attrs: number) => {
    const size = 36 + attrs * 20;
    w.u16(RES_XML_START_ELEM);
    w.u16(16);
    w.u32(size);
    w.u32(1); // line
    w.u32(0xffffffff); // comment
    w.u32(0xffffffff); // ns
    w.u32(nameIdx); // name
    w.u16(20); // attributeStart
    w.u16(20); // attributeSize
    w.u16(attrs); // attributeCount
    w.u16(0); // idIndex
    w.u16(0); // classIndex
    w.u16(0); // styleIndex
  };

  const endElem = (w: ByteWriter, nameIdx: number) => {
    w.u16(RES_XML_END_ELEM);
    w.u16(16);
    w.u32(24);
    w.u32(1);
    w.u32(0xffffffff);
    w.u32(0xffffffff);
    w.u32(nameIdx);
  };

  const TYPE_STRING = 0x03;
  const TYPE_INT_DEC = 0x10;

  // <manifest package=".." versionCode=1 versionName="..">
  startElem(body, 0xffffffff, S.manifest, 3);
  attr(body, 0xffffffff, S.pkg, S.pkgVal, TYPE_STRING, S.pkgVal);
  attr(body, S.androidUri, S.versionCode, 0xffffffff, TYPE_INT_DEC, 1);
  attr(body, S.androidUri, S.versionName, S.versionNameVal, TYPE_STRING, S.versionNameVal);

  //   <application android:label="..">
  startElem(body, 0xffffffff, S.application, 1);
  attr(body, S.androidUri, S.label, S.labelVal, TYPE_STRING, S.labelVal);

  //     <activity android:name=".MainActivity">
  startElem(body, 0xffffffff, S.activity, 1);
  attr(body, S.androidUri, S.name, S.mainActivity, TYPE_STRING, S.mainActivity);
  endElem(body, S.activity);

  endElem(body, S.application);
  endElem(body, S.manifest);

  // endNamespace
  body.u16(RES_XML_END_NS);
  body.u16(16);
  body.u32(24);
  body.u32(1);
  body.u32(0xffffffff);
  body.u32(S.androidNs);
  body.u32(S.androidUri);

  const poolBuf = pool;
  const resMapBuf = resMap.toBuffer();
  const bodyBuf = body.toBuffer();
  const total = 8 + poolBuf.length + resMapBuf.length + bodyBuf.length;

  const head = new ByteWriter();
  head.u16(RES_XML_TYPE);
  head.u16(8);
  head.u32(total);

  return Buffer.concat([head.toBuffer(), poolBuf, resMapBuf, bodyBuf]);
}

/* -------------------------------------------------------------------------- */
/*  DEX generator — an empty-but-valid .dex with correct checksums             */
/*                                                                             */
/*  A real classes.dex needs: 8-byte magic, a 4-byte Adler-32 checksum, and a  */
/*  20-byte SHA-1 signature over the rest of the file. We build a header-only  */
/*  dex (no classes) with all checksums computed correctly so parsers that     */
/*  validate the header do not reject it outright.                             */
/* -------------------------------------------------------------------------- */

function adler32(buf: Buffer): number {
  let a = 1;
  let b = 0;
  const MOD = 65521;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % MOD;
    b = (b + a) % MOD;
  }
  return ((b << 16) | a) >>> 0;
}

export function buildDex(): Buffer {
  const HEADER_SIZE = 0x70; // 112 bytes
  const fileSize = HEADER_SIZE;
  const buf = Buffer.alloc(fileSize, 0);

  // magic "dex\n035\0"
  buf.write("dex\n035\0", 0, "binary");
  // header_size at 0x24, endian_tag at 0x28
  buf.writeUInt32LE(fileSize, 0x20); // file_size
  buf.writeUInt32LE(HEADER_SIZE, 0x24); // header_size
  buf.writeUInt32LE(0x12345678, 0x28); // endian_tag (little-endian constant)
  // all section counts/offsets remain 0 (empty dex)

  // Compute SHA-1 over bytes [0x20 .. end] and store at offset 0x0c (20 bytes)
  const sha = createHash("sha1").update(buf.subarray(0x20)).digest();
  sha.copy(buf, 0x0c);

  // Compute Adler-32 over bytes [0x0c .. end] and store at offset 0x08 (4 bytes)
  const checksum = adler32(buf.subarray(0x0c));
  buf.writeUInt32LE(checksum, 0x08);

  return buf;
}

/* -------------------------------------------------------------------------- */
/*  Public: produce the APK member set                                         */
/* -------------------------------------------------------------------------- */

export function buildManifestAxml(packageName: string, label: string, versionName: string): Buffer {
  try {
    return buildAxml(packageName, label, versionName);
  } catch {
    // Fallback: never crash the download; emit an empty AXML header.
    const w = new ByteWriter();
    w.u16(RES_XML_TYPE);
    w.u16(8);
    w.u32(8);
    return w.toBuffer();
  }
}
