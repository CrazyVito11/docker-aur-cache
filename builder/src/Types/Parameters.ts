import PackageConfiguration from "./PackageConfiguration"

export default interface Parameters {
    build_dir: string
    package_staging_dir: string
    aur_package_list_path: string
    custom_packages_dir: string
    package_configuration: PackageConfiguration
};
