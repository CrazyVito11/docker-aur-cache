import PackageBuildReport from "./PackageBuildReport";

export default interface BuildReport {
    version: number,
    buildStartTime: string,
    buildEndTime: string,
    packages: Array<PackageBuildReport>,
};
