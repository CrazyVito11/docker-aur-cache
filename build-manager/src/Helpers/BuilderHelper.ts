import { MountConfig } from 'dockerode';
import PackageConfiguration from '../Types/PackageConfiguration';

export default class BuilderHelper {
    public static getBuilderStartCommand(aurPackageListPath: string, packageConfiguration: PackageConfiguration): string {
        const packageConfigurationEncoded = Buffer.from(JSON.stringify(packageConfiguration)).toString('base64');

        return `cd /builder; node ./dist/builder.js --package_configuration_encoded="${packageConfigurationEncoded}" --build_dir="/repository-builder" --package_staging_dir="/package-staging" --custom_packages_dir="/custom-packages" --aur_package_list_path="${aurPackageListPath}"`;
    }

    public static getBuilderMounts(): MountConfig {
        return [
            {
                Target: '/package-staging',
                Source: 'docker-aur-cache_package-staging',
                Type: 'volume',
                ReadOnly: false,
            },
            {
                Target: '/aur-package-list',
                Source: 'docker-aur-cache_aur-package-list',
                Type: 'volume',
                ReadOnly: true,
            },
            {
                Target: '/custom-packages',
                Source: process.env.CUSTOM_PACKAGES_HOST_PATH!,
                Type: 'bind',
                ReadOnly: true,
            }
        ];
    }
}
