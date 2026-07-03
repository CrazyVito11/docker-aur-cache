export default interface ContainerStatsLine {
    sampleTakenAt: string,
    cpuUsagePercent: number,
    memoryUsageMB: number,
    memoryUsagePercent: number,
}