// Buffer shim for esbuild inject
// This file is automatically prepended to all modules during pre-bundling
import { Buffer as BufferPolyfill } from 'buffer';
export { BufferPolyfill as Buffer };
globalThis.Buffer = BufferPolyfill;
