import { execSync } from "child_process";

export default class MakepkgHelper {
    private static makepkgPrintSrcRegex = new RegExp(/^\s*([a-z0-9]+)\ \=\ (.+)$/gm);

    public static parsePkgbuildFile(pkgbuildFilePath: string): object {
        const consoleOutput = execSync(`cd $(dirname $(readlink -f "${pkgbuildFilePath}")); makepkg --printsrcinfo`);
        const matches       = consoleOutput.toString().matchAll(MakepkgHelper.makepkgPrintSrcRegex);

        const parsedData: Record<string, any> = {};

        for (const match of matches) {
            const key = match[1];
            const value = match[2];

            // Does the key already exist and is it not an array yet?
            // If so, wrap it into an array
            if (key in parsedData && ! (parsedData[key] instanceof Array)) {
                parsedData[key] = [parsedData[key]];
            }

            // Does the key already exist and is it already an array?
            // If so, push the item
            if (key in parsedData && parsedData[key] instanceof Array) {
                parsedData[key].push(value);

                continue;
            }

            // It's a "regular" item, simply push it
            parsedData[key] = value;
        }

        return parsedData;
    }

    public static getDependsFromPkgbuildData(pkgbuildData: object): Array<string> {
        if (! ("depends" in pkgbuildData)) {
            return [];
        }

        // If it's only 1 package, it will be interpreted as a field instead of an array
        if (typeof pkgbuildData.depends === "string") {
            return MakepkgHelper.removeVersionRequirementsFromPackageNameList(
                [pkgbuildData.depends]
            );
        }

        // Mostly just in case it some weird value
        if (! Array.isArray(pkgbuildData.depends)) {
            return [];
        }

        return MakepkgHelper.removeVersionRequirementsFromPackageNameList(
            pkgbuildData.depends
        );
    }

    public static getMakeDependsFromPkgbuildData(pkgbuildData: object): Array<string> {
        if (! ("makedepends" in pkgbuildData)) {
            return [];
        }

        // If it's only 1 package, it will be interpreted as a field instead of an array
        if (typeof pkgbuildData.makedepends === "string") {
            return MakepkgHelper.removeVersionRequirementsFromPackageNameList(
                [pkgbuildData.makedepends]
            );
        }

        // Mostly just in case it some weird value
        if (! Array.isArray(pkgbuildData.makedepends)) {
            return [];
        }

        return MakepkgHelper.removeVersionRequirementsFromPackageNameList(
            pkgbuildData.makedepends
        );
    }

    public static getCheckDependsFromPkgbuildData(pkgbuildData: object): Array<string> {
        if (! ("checkdepends" in pkgbuildData)) {
            return [];
        }

        // If it's only 1 package, it will be interpreted as a field instead of an array
        if (typeof pkgbuildData.checkdepends === "string") {
            return MakepkgHelper.removeVersionRequirementsFromPackageNameList(
                [pkgbuildData.checkdepends]
            );
        }

        // Mostly just in case it some weird value
        if (! Array.isArray(pkgbuildData.checkdepends)) {
            return [];
        }

        return MakepkgHelper.removeVersionRequirementsFromPackageNameList(
            pkgbuildData.checkdepends
        );
    }

    public static getConflictsFromPkgbuildData(pkgbuildData: object): Array<string> {
        if (! ("conflicts" in pkgbuildData)) {
            return [];
        }

        if (typeof pkgbuildData.conflicts === "string") {
            return MakepkgHelper.removeVersionRequirementsFromPackageNameList([pkgbuildData.conflicts]);
        }

        if (! Array.isArray(pkgbuildData.conflicts)) {
            return [];
        }

        return MakepkgHelper.removeVersionRequirementsFromPackageNameList(pkgbuildData.conflicts);
    }

    public static removeVersionRequirementsFromPackageNameList(packageNames: Array<string>): Array<string> {
        return packageNames.map((packageName: string) => {
            const newPackageName = packageName.split(/(>=|<=|>|<|==)/)[0].trim();

            if (newPackageName !== packageName) {
                console.warn(`[builder] Found package "${packageName}" which has a version constraint, this version constraint has been stripped as this is not yet supported.`);
            }

            return newPackageName;
        });
    }
}
