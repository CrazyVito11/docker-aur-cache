import { Transform } from "stream";
import PackageBuildReportLogLine from "../Types/PackageBuildReportLogLine";

export default class LineTransformer extends Transform {
    private buffer = Buffer.from('');
    private nextDataType: number|null = null;
    private nextDataLength: number|null = null;

    constructor() {
        super({ readableObjectMode: true });

        this.buffer = Buffer.from('');
        this.nextDataType = null;
        this.nextDataLength = null;
    }

    public _transform(chunk: any, encoding: BufferEncoding, callback: Function) {
        this.processChunk(chunk);

        callback();
    }

    private processChunk(chunk: any) {
        if (chunk) {
            this.buffer = Buffer.concat([this.buffer, chunk]);
        }

        if (! this.nextDataType) {
            if (this.buffer.length >= 8) {
                const header = this.bufferSlice(8);

                this.nextDataType = header.readUInt8(0);
                this.nextDataLength = header.readUInt32BE(4);

                // It's possible we got a "data" that contains multiple messages
                // Process the next one
                this.processChunk(null);
            }
        } else {
            if (this.nextDataLength && this.buffer.length >= this.nextDataLength) {
                const content = this.bufferSlice(this.nextDataLength);

                const logLine: PackageBuildReportLogLine = {
                    timestamp: new Date().toISOString(),
                    type: this.nextDataType === 1 ? "standard" : "error",
                    value: content.toString('utf8')
                };

                this.push(logLine);

                this.nextDataType = null;

                // It's possible we got a "data" that contains multiple messages
                // Process the next one
                this.processChunk(null);
            }
        }
    }

    private bufferSlice(end: number) {
        const out = this.buffer.subarray(0, end);

        this.buffer = Buffer.from(this.buffer.subarray(end, this.buffer.length));

        return out;
    }
}
