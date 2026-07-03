import { Transform } from "stream";
import { ContainerStats } from "dockerode";
import ContainerStatsLine from "../Types/ContainerStatsLine";

export default class ContainerStatsTransformer extends Transform {
    private buffer = '';

    constructor() {
        super({ readableObjectMode: true });
    }

    public _transform(data: any, encoding: BufferEncoding, callback: Function) {
        // The stats stream is newline-delimited JSON, so we need to buffer it
        this.buffer += data.toString();

        // Split each newline to get each full stats JSON object
        const statsJsonMessages = this.buffer.split('\n');

        // Keep the last element in the buffer, as it may be an incomplete JSON object
        this.buffer = statsJsonMessages.pop() ?? '';

        for (const statsJsonMessage of statsJsonMessages) {
            const trimmedStatsJsonMessage = statsJsonMessage.trim();

            // Skip empty lines that may appear between JSON objects
            if (! trimmedStatsJsonMessage) continue;

            try {
                this.processStats(trimmedStatsJsonMessage);
            } catch (e) {
                console.error(`[build-manager] An error occurred while processing the container stats`, e);
            }
        }

        callback();
    }

    private processStats(data: string) {
        const stats: ContainerStats = JSON.parse(data);

        // CPU Usage calculation
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemCpuDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        const cpuUsagePercent = (cpuDelta / systemCpuDelta) * stats.cpu_stats.online_cpus * 100;

        // Memory Usage calculation
        const memoryCached = stats.memory_stats?.stats?.cache ?? 0;
        const memoryUsageMB = (stats.memory_stats.usage - memoryCached) / (1024 * 1024); // Convert to MB
        const memoryLimitMB = stats.memory_stats.limit / (1024 * 1024); // Convert to MB
        const memoryUsagePercent = (memoryUsageMB / memoryLimitMB) * 100;

        // Throw away invalid samples
        if (typeof cpuUsagePercent !== 'number' || typeof memoryUsageMB !== 'number' || typeof memoryUsagePercent !== 'number') {
            return;
        }

        const containerStats: ContainerStatsLine = {
            sampleTakenAt: new Date().getTime(),
            cpuUsagePercent: parseFloat(cpuUsagePercent.toFixed(2)),
            memoryUsageMB: parseFloat(memoryUsageMB.toFixed(2)),
            memoryUsagePercent: parseFloat(memoryUsagePercent.toFixed(2))
        };

        this.push(containerStats);
    }
}
