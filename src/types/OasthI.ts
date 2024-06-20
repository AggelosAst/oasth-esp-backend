import {Line} from "./line";
import {Route} from "./route";

export interface OasthI {
    getLineDataFromLineID(lineID: string): Line | undefined;
    getLineDataFromLineCode(lineCode: string): Line | undefined;
    getLines(): Promise<boolean>;
    getLinesRaw(): string;
}