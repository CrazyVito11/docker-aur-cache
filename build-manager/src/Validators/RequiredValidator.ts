import IValidator from "./IValidator";

export default class RequiredValidator implements IValidator {
    public validate(value: any): boolean {
        if (value === null) {
            return false;
        }

        if (typeof value === "string") {
            return this.validateAsString(value);
        }

        if (typeof value === "object") {
            return this.validateAsObject(value);
        }

        if (typeof value === "number") {
            return this.validateAsNumber(value);
        }

        if (typeof value === "boolean") {
            return this.validateAsBoolean(value);
        }

        return false;
    };

    private validateAsString(value: string): boolean {
        return value.length > 0;
    }

    private validateAsObject(value: object): boolean {
        return Object.keys(value).length > 0;
    }

    private validateAsNumber(value: number): boolean {
        // We can't validate numbers any further

        return true;
    }

    private validateAsBoolean(value: boolean): boolean {
        // We can't validate booleans any further

        return true;
    }

    public validationFailedMessage(value: any): string {
        return "This value is required";
    }
}
