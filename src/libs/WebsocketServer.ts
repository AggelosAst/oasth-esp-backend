import WebSocket, {WebSocketServer} from "ws";
import {WebsocketPayload} from "../types/websocketPayload";
import {IncomingMessage} from "node:http";
import {OasthConf} from "./OasthConf";
import {Stop} from "../types/stopsAndDetails";
import {Oasth} from "./Oasth";
import {ClosestStop} from "../types/closestStop";
import {BusLocationData} from "../types/BusLocationData";
import haversine from "haversine"
import {Line} from "../types/line";
import * as csv from "csv"
import * as fs from "node:fs";
import {CsvWriter} from "./CsvWriter";
import {DateTime} from "luxon";

export class WebsocketServer {
	public static websocketInstance: WebsocketServer
	private readonly wsServer: WebSocketServer
	
	
	public constructor(server: any) {
		this.wsServer = new WebSocketServer({
			server: server,
			path: "/ws"
		})
		WebsocketServer.websocketInstance = this
		this.wsServer.on("connection", this.onConnection.bind(this));
	}
	
	private async onMessage(ws: WebSocket, message: WebSocket.RawData): Promise<void> {
		let payload!: WebsocketPayload
		try {
			payload = JSON.parse(message.toString())
		} catch (e) {
			ws.send(JSON.stringify({
				message: "Invalid payload",
				error: e
			}))
		}
		switch (payload.type) {
			case "ping":
				ws.send(JSON.stringify({
					type: "ping"
				}))
				break
			case "get_conf":
				ws.send(JSON.stringify({
					type: "get_conf",
					lineId: OasthConf.lineId,
					direction: OasthConf.direction,
				}))
				break
			case "get_bus_loc":
				if (OasthConf.busStops.length < 1) {
					console.log(`[BUS LOC]: Fetch bus stops for first time`)
					OasthConf.busStops = await Oasth.Instance.getBusStops(OasthConf.lineId, OasthConf.direction)
				}
				if (!OasthConf.lineInfo) {
					console.log(`[BUS LOC]: Fetch line info for first time`)
					OasthConf.lineInfo = await Oasth.Instance.getLineIDInfo(OasthConf.lineId) as Line;
				}
				const Stops: Stop[] = OasthConf.busStops
				const LineInfo = OasthConf.lineInfo
				
				const RouteOrder = Stops.map(stop => {
					return {
						routeOrder: stop.RouteStopOrder,
						name: stop.StopDescrEng
					}
				})
				const lastStop = RouteOrder[RouteOrder.length - 1]
				
				let BusLocations!: BusLocationData[]
				try {
					BusLocations = await Oasth.Instance.getBusLocation(OasthConf.lineId, OasthConf.direction)
				} catch (e) {
					return ws.send(JSON.stringify({
						["type"]: "get_bus_loc",
						["arrived"]: false,
						["no_bus"]: false,
						["error"]: true,
						["message"]: e
					}))
				}
				if (BusLocations.length > 0) {
					if (OasthConf.targetBus) {
						const foundBusLoc = BusLocations.findIndex(bus => bus.VEH_NO === OasthConf.targetBus)
						if (foundBusLoc == -1) {
							const arrivalTime = DateTime.now().toMillis()
							const save = await CsvWriter.Instance.Save(OasthConf.targetBus, LineInfo.LineID, arrivalTime, OasthConf.targetBusStart!)
							console.log(`[${OasthConf.targetBus}] [${LineInfo?.LineDescrEng}]: The bus has arrived to the destination \x1b[32m[${lastStop.name.trim()}]\x1b[0m!, the ${lastStop.routeOrder}th bus stop.`)
							ws.send(JSON.stringify({
								["type"]: "get_bus_loc",
								["no_bus"]: false,
								["arrived"]: true,
								["error"]: false,
								["vehicle"]: {
									["vehicle_number"]: OasthConf.targetBus,
								},
								["destination"]: {
									["name"]: lastStop.name,
									["pos"]: lastStop.routeOrder,
									["bus_stop"]: Stops.find(stop => stop.StopDescrEng == lastStop.name)
								}
							}))
							OasthConf.targetBus = undefined
							OasthConf.targetBusStart = undefined;
							return
						} else {
							console.log(`Bus is still on a route`)
							const targetBus: BusLocationData = BusLocations.at(0)!
							
							console.log(`[BUS COORDS]: Longtitude: ${targetBus.CS_LNG} Latitude: ${targetBus.CS_LAT}`) /* DEBUG: Print the buses location */
							
							const closestStops: ClosestStop[] = []
							
							for (const stop of Stops) {
								const haversineFormula: number = haversine({
									longitude: parseFloat(targetBus.CS_LNG),
									latitude: parseFloat(targetBus.CS_LAT)
								}, {
									longitude: parseFloat(stop.StopLng),
									latitude: parseFloat(stop.StopLat)
								}, {
									unit: "meter"
								})
								if (haversineFormula <= 300) { /* Entirely configurable. */
									const Stop: ClosestStop = stop as ClosestStop
									Stop.distance = haversineFormula
									closestStops.push(Stop)
								}
							}
							closestStops.sort((firstStop: ClosestStop, secondStop: ClosestStop) => firstStop.distance! - secondStop.distance!)
							
							
							// if (closestStops.at(0)) {
							// 	if (closestStops.at(0)!.StopDescr) {
							// 		// @ts-ignore
							// 		delete closestStops.at(0)!.StopDescr
							// 	}
							//
							// 	// @ts-ignore
							// 	delete closestStops.at(0)!.StopStreet
							// 	//@ts-ignore
							// 	delete closestStops.at(0)!.StopHeading
							// 	//@ts-ignore
							// 	delete closestStops.at(0)!.StopLat
							// 	//@ts-ignore
							// 	delete closestStops.at(0)!.StopLng
							// 	//@ts-ignore
							// 	delete closestStops.at(0)!.StopType
							// 	//@ts-ignore
							// 	delete closestStops.at(0)!.StopAmea
							// }
							
							ws.send(JSON.stringify({
								["type"]: "get_bus_loc",
								["arrived"]: false,
								["no_bus"]: false,
								["error"]: false,
								["vehicle"]: {
									["vehicle_number"]: targetBus.VEH_NO,
									// ["vehicle_long"]: targetBus.CS_LNG,
									// ["vehicle_lat"]: targetBus.CS_LAT
								},
								["closest_bus_stop"]: closestStops.at(0) !== undefined ? closestStops.at(0) : {
									["distance"]: 0,
									["StopDescrEng"]: "Unknown Stop"
								},
								["bus_stops_count"]: Stops.length,
								["last_bus_stop"]: lastStop,
								["current_bus_stop_pos"]: closestStops.at(0) !== undefined ? closestStops.at(0)!.RouteStopOrder : "Unknown",
								// ["bus_stops"]: Stops,
							}))
							return
						}
					} else {
						const firstBus: BusLocationData = BusLocations.at(0)!
						OasthConf.setTargetBus(firstBus.VEH_NO)
						OasthConf.setBusStartTimestamp(DateTime.fromFormat(firstBus.CS_DATE, "yyyy-MM-dd HH:mm:ss", {zone: "Europe/Athens", locale: "el-gr"}).toMillis())
						
						console.log(`[BUS COORDS]: Longtitude: ${firstBus.CS_LNG} Latitude: ${firstBus.CS_LAT}`) /* DEBUG: Print the buses location */
						
						const closestStops: ClosestStop[] = []
						
						for (const stop of Stops) {
							const haversineFormula: number = haversine({
								longitude: parseFloat(firstBus.CS_LNG),
								latitude: parseFloat(firstBus.CS_LAT)
							}, {
								longitude: parseFloat(stop.StopLng),
								latitude: parseFloat(stop.StopLat)
							}, {
								unit: "meter"
							})
							if (haversineFormula <= 300) { /* Entirely configurable. */
								const Stop: ClosestStop = stop as ClosestStop
								Stop.distance = haversineFormula
								closestStops.push(Stop)
							}
						}
						closestStops.sort((firstStop: ClosestStop, secondStop: ClosestStop) => firstStop.distance! - secondStop.distance!)
						
						
						
						// if (closestStops.at(0)) {
						// 	if (closestStops.at(0)!.StopDescr) {
						// 		// @ts-ignore
						// 		delete closestStops.at(0)!.StopDescr
						// 	}
						//
						// 	// @ts-ignore
						// 	delete closestStops.at(0)!.StopStreet
						// 	//@ts-ignore
						// 	delete closestStops.at(0)!.StopHeading
						// 	//@ts-ignore
						// 	delete closestStops.at(0)!.StopLat
						// 	//@ts-ignore
						// 	delete closestStops.at(0)!.StopLng
						// 	//@ts-ignore
						// 	delete closestStops.at(0)!.StopType
						// 	//@ts-ignore
						// 	delete closestStops.at(0)!.StopAmea
						// }
						
						
						ws.send(JSON.stringify({
							["type"]: "get_bus_loc",
							["arrived"]: false,
							["no_bus"]: false,
							["error"]: false,
							["vehicle"]: {
								["vehicle_number"]: firstBus.VEH_NO,
								//	["vehicle_long"]: firstBus.CS_LNG,
								//	["vehicle_lat"]: firstBus.CS_LAT
							},
							["closest_bus_stop"]: closestStops.at(0) !== undefined ? closestStops.at(0) : {
								["distance"]: 0,
								["StopDescrEng"]: "Unknown Stop"
							},
							["bus_stops_count"]: Stops.length,
							["last_bus_stop"]: lastStop,
							["current_bus_stop_pos"]: closestStops.at(0) !== undefined ? closestStops.at(0)!.RouteStopOrder : "Unknown",
							//	["bus_stops"]: Stops,
						}))
						return
					}
				} else {
					if (OasthConf.targetBus) {
						const arrivalTime = DateTime.now().toMillis()
						const save = await CsvWriter.Instance.Save(OasthConf.targetBus, LineInfo.LineID, arrivalTime, OasthConf.targetBusStart!)
						console.log(`[${OasthConf.targetBus}] [${LineInfo?.LineDescrEng}]: The bus has arrived to the destination \x1b[32m[${lastStop.name.trim()}]\x1b[0m!, the ${lastStop.routeOrder}th bus stop.`)
						ws.send(JSON.stringify({
							["type"]: "get_bus_loc",
							["no_bus"]: false,
							["arrived"]: true,
							["error"]: false,
							["vehicle"]: {
								["vehicle_number"]: OasthConf.targetBus,
							},
							["destination"]: {
								["name"]: lastStop.name,
								["pos"]: lastStop.routeOrder,
								["bus_stop"]: Stops.find(stop => stop.StopDescrEng == lastStop.name)
							}
						}))
						OasthConf.targetBus = undefined
						OasthConf.targetBusStart = undefined;
						return
					} else {
						ws.send(JSON.stringify({
							["type"]: "get_bus_loc",
							["arrived"]: false,
							["no_bus"]: true,
							["error"]: false
						}))
						return
					}
				}
				break
			case "get_data":
				let busData: { bus_no: string[], bus_line: string, times: number, arrivalTimes: number[], startTimes: number[] }[] = [];
				const csvData = csv.parse(fs.readFileSync("data.csv"), {
					columns: ["bus_no", "bus_line", "arrival_time", "start_time"],
					from_line: 2,
				})
				await csvData.forEach(d => {
					const busDataC = busData.find(bus => bus.bus_line === d["bus_line"])
					if (!busDataC) {
						busData.push({
							bus_line: d["bus_line"],
							bus_no: [d["bus_no"]],
							times: 1,
							arrivalTimes: [d["arrival_time"]],
							startTimes: [d["start_time"]]
						})
					} else {
						const busDataIndex = busData.findIndex(bus => bus.bus_line === d["bus_line"])!
						busData[busDataIndex].times += 1
						busData[busDataIndex].arrivalTimes.push(d["arrival_time"])
						busData[busDataIndex].bus_no.push(d["bus_no"])
						busData[busDataIndex].startTimes.push(d["start_time"])
					}
				})
				ws.send(JSON.stringify({
					type: "get_data",
					data: busData
				}))
				break;
		}
	}
	
	private async onConnection(ws: WebSocket, request: IncomingMessage): Promise<void> {
		ws.on("message", (message: WebSocket.RawData) => this.onMessage(ws, message));
		ws.on("close", this.onDisconnection);
		console.log(`[WEBSOCKET]: Client connected.`)
	}
	
	private async onDisconnection(ws: WebSocket, code: number): Promise<void> {
		console.log("Disconnected", code.toString())
	}
}