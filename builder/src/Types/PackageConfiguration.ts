export default interface PackageConfiguration {
    packageName: string,
    enforceCustomPackage?: boolean,
    runCommandsBeforeBuild?: Array<string>,
    resolveDependenciesAs?: {[key: string]: string};
};
