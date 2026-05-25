/**
 * Custom Jest environment: extends jest-environment-jsdom and patches in the
 * Web Platform globals that Node.js 18+ ships (via undici / stream/web) but
 * that jsdom 26 does NOT expose.  Firebase SDK and Angular Fire require these.
 */
const { TestEnvironment: JsdomEnvironment } = require('jest-environment-jsdom');
const { TextDecoder, TextEncoder } = require('util');
const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
const { MessagePort, MessageChannel } = require('worker_threads');

class CustomJsdomEnvironment extends JsdomEnvironment {
  async setup() {
    await super.setup();

    // Patch TextDecoder / TextEncoder
    if (!this.global.TextDecoder) this.global.TextDecoder = TextDecoder;
    if (!this.global.TextEncoder) this.global.TextEncoder = TextEncoder;

    // Patch Streams
    if (!this.global.ReadableStream) this.global.ReadableStream = ReadableStream;
    if (!this.global.WritableStream) this.global.WritableStream = WritableStream;
    if (!this.global.TransformStream) this.global.TransformStream = TransformStream;

    // MessagePort / MessageChannel (needed by undici webidl)
    if (!this.global.MessagePort) this.global.MessagePort = MessagePort;
    if (!this.global.MessageChannel) this.global.MessageChannel = MessageChannel;

    // fetch / Headers / Request / Response via undici
    if (!this.global.fetch) {
      try {
        const undici = require('undici');
        this.global.fetch = undici.fetch;
        this.global.Headers = undici.Headers;
        this.global.Request = undici.Request;
        this.global.Response = undici.Response;
        if (!this.global.FormData) this.global.FormData = undici.FormData;
        if (!this.global.File) this.global.File = undici.File;
      } catch (e) {
        // undici not available; tests that need fetch will fail with a clear error
      }
    }
  }
}

module.exports = CustomJsdomEnvironment;
