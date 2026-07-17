import { execSync } from 'child_process';
import PackageHelper from './Helpers/PackageHelper';
import ParameterHelper from './Helpers/ParameterHelper';

const paramsRaw = ParameterHelper.getRawParameters();

if (! ParameterHelper.validateRequiredParameters(paramsRaw)) {
    console.error("Required parameters are missing or invalid");

    process.exit(1);
}

const params = ParameterHelper.getParametersFromRawParameters(paramsRaw);

console.log(`Package configuration: ${JSON.stringify(params.package_configuration)}`);
console.log(`Build directory: ${params.build_dir}`);
console.log(`Custom packages directory: ${params.custom_packages_dir}`);
console.log(`Package staging directory: ${params.package_staging_dir}`);
console.log(`AUR package list path: ${params.aur_package_list_path}`);



const publishBuildPackages = async () => {
    console.log("[builder] Copying new packages to package staging");
    execSync(`cp ${params.build_dir}/**/*.pkg.tar.zst ${params.package_staging_dir}/`);
}

const runCommandsBeforeBuild = async () => {
    if (! params.package_configuration.runCommandsBeforeBuild) {
        // No commands to process beforehand

        return;
    }

    console.log(`[builder] Processing run before build commands`);

    for (const command of params.package_configuration.runCommandsBeforeBuild) {
        console.log(`[builder] Running command: ${command}`);

        execSync(command);

        console.log(`[builder] Done running command: ${command}`);
    }

    console.log(`[builder] Done processing run before build commands`);
}

const buildPackage = async () => {
    const packageName = params.package_configuration.packageName;

    console.log(`[builder] Processing "${packageName}"`);

    await PackageHelper.installPackage(
        params,
        packageName
    );

    console.log(`[builder] Done processing "${packageName}"`);
}

const startBuildProcess = async () => {
    await runCommandsBeforeBuild();
    await buildPackage();
    await publishBuildPackages();
}

startBuildProcess();
