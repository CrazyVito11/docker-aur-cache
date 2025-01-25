import IValidator from "../Validators/IValidator";
import RegexValidator from "../Validators/RegexValidator";
import RequiredValidator from "../Validators/RequiredValidator";
import TypeValidator from "../Validators/TypeValidator";

export default class PackagelistConfigHelper {

    public static getPackagelistConfigValidationRules(): {[key: string]: Array<IValidator>} {
        return {
            'builderLimit': [
                new RequiredValidator(),
                new TypeValidator("object")
            ],
            'builderLimit.maxBuildTime': [
                new RequiredValidator(),
                new TypeValidator("string"),
                new RegexValidator(new RegExp(/^(\d+)(s|m|h)$/))
            ],
            'builderLimit.cpusetCpus': [
                new RequiredValidator(),
                new TypeValidator("string"),
                new RegexValidator(new RegExp(/^\d+-\d+$|^\d+(?:,\d+)*$/g))
            ],
            'builderLimit.memory': [
                new RequiredValidator(),
                new TypeValidator("string"),
                new RegexValidator(new RegExp(/^(\d+)(b|k|m|g)$/))
            ],

            'packages': [
                new RequiredValidator(),
                new TypeValidator("object")
            ],
            'packages.*': [
                new RequiredValidator(),
                new TypeValidator("object")
            ],
            'packages.*.enabled': [
                new RequiredValidator(),
                new TypeValidator("boolean")
            ],
            'packages.*.packageName': [
                new RequiredValidator(),
                new TypeValidator("string")
            ],
            'packages.*.resolveDependenciesAs': [
                new TypeValidator("object")
            ],
            'packages.*.resolveDependenciesAs.*': [
                new RequiredValidator(),
                new TypeValidator("string")
            ],
            'packages.*.runCommandsBeforeBuild': [
                new TypeValidator("object")
            ],
            'packages.*.runCommandsBeforeBuild.*': [
                new RequiredValidator(),
                new TypeValidator("string")
            ],
        };
    }
}
