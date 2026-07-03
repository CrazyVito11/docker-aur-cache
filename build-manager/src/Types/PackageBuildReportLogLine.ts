
export default interface PackageBuildReportLogLine {
    timestamp: string,
    type: "standard" | "error",
    value: string
};
