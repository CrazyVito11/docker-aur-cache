import type Parameters from "../Types/Parameters";

export default class ParameterHelper {
    public static getParameters(): Parameters {
        return require('minimist')(process.argv.slice(2));
    }

    public static validateRequiredParameters(params: Parameters): boolean {
        return (
            typeof params.builder_image_name === "string" &&
            typeof params.packagelist_configuration_path === "string" &&
            typeof params.builder_dir === "string" &&
            typeof params.package_staging_dir === "string" &&
            typeof params.build_report_dir === "string" &&
            typeof params.repository_archive_dir === "string" &&
            typeof params.repository_dir === "string" &&
            typeof params.repository_name === "string"
            // TODO: Implement better validation (path exists, packagelist is valid format etc.)
        );
    }
}
