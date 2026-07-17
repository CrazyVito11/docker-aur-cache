export default interface PackageConfiguration {
    enabled: boolean,
    packageName: string,
    enforceCustomPackage?: boolean,
    runCommandsBeforeBuild?: Array<string>,
    resolveDependenciesAs?: {[key: string]: string};
};
