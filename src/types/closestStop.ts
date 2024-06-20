import {Stop} from "./stopsAndDetails";

export type ClosestStop = Stop & {
	distance: number
}