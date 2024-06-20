import {Stop} from "../types/stopsAndDetails";
import {Line} from "../types/line";
import {BusRecord} from "../types/BusRecord";

export class OasthConf {
	public static lineId: string = "03K"
	public static direction: "Return" | "Arrival" = "Arrival"
	public static targetBus: string | undefined = ""
	public static targetBusStart: number | undefined = undefined
	public static busStops: Stop[] = []
	public static lineInfo: Line
	public static BusRecords: BusRecord[] = []
	
	public static setTargetBus(t: string) : void {
		this.targetBus = t
	}
	
	public static setBusStartTimestamp(t: number) : void {
		this.targetBusStart = t
	}
	public static getTargetBus(t: string) : string | undefined {
		return this.targetBus
	}
}