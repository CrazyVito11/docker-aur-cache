export default interface PackageConfiguration {
    enabled: boolean,
    packageName: string,
    runCommandsBeforeBuild?: Array<string>,
    resolveDependenciesAs?: {[key: string]: string};
};
