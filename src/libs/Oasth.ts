import {OasthOptions} from "../types/oasthOptions";
import axios, {AxiosError, AxiosResponse} from "axios"
import {OasthI} from "../types/OasthI";
import {APIs} from "./APIs";
import {RequestData} from "./RequestData";
import {Line} from "../types/line";
import {Route} from "../types/route";
import {StopsAndDetails} from "../types/stopsAndDetails";
import JsSHA from "jssha";
import {BusLocationData} from "../types/BusLocationData";

export class Oasth implements OasthI {
	private phpSessionId: string | undefined = undefined
	private LineData: Line[] = []
	private readonly reuseSessions: boolean
	private csrfToken: string | undefined = undefined;
	private readonly newCsrfTokenEvery: number = 3600000
	private readonly busHistory = []
	
	public static Instance: Oasth
	
	public constructor(options: OasthOptions) {
		this.reuseSessions = options.options.reuseSessions
		Oasth.Instance = this
	}
	
	public startRenewSchedule(): void {
		setInterval(async() => {
			console.log(`[CSRF]: Generating new csrf token and session`)
			await this.getSessionToken()
			this.csrfToken = this.generateCSRF()
		}, this.newCsrfTokenEvery)
	}
	
	public getLineDataFromLineCode(lineCode: string): Line | undefined {
		const foundLine: Line | undefined = this.LineData.find(line => line.LineCode === lineCode)
		if (foundLine) {
			return foundLine
		} else {
			return undefined
		}
	}
	
	public getSessionToken(): Promise<string> {
		return new Promise(async (resolve, reject) => {
			axios.get(APIs.getLangs, {
				headers: {...RequestData, ...this.applyCookies()}
			}).then((response: AxiosResponse) => {
				const phpSessionId: string | undefined = response.headers["set-cookie"] ? response.headers["set-cookie"]!.at(0)!.split(";")[0].replace("PHPSESSID=", "") : undefined
				this.alterCookies(phpSessionId)
				resolve(phpSessionId!)
			}).catch((error: AxiosError) => {
				resolve("ERROR")
			})
		})
	}
	
	public getLineDataFromLineID(lineID: string): Line | undefined {
		console.log(lineID)
		const foundLine: Line | undefined = this.LineData.find(line => line.LineID === lineID)
		if (foundLine) {
			return foundLine
		} else {
			return undefined
		}
	}
	
	public getLinesRaw(): string {
		const RawLines: string[] = this.LineData.map(l => {
			return `${l.LineID} => ${l.LineDescrEng}`
		})
		return RawLines.join(", \n")
	}
	
	public async getLines(): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			axios.get(APIs.GetLines, {
				headers: {...RequestData, ...this.applyCookies()}
			}).then((response: AxiosResponse) => {
				const phpSessionId: string | undefined = response.headers["set-cookie"] ? response.headers["set-cookie"]!.at(0)!.split(";")[0].replace("PHPSESSID=", "") : undefined
				this.alterCookies(phpSessionId)
				
				this.LineData = response.data
				return resolve(true)
			}).catch((error: AxiosError) => {
				reject(error)
			})
		})
	}
	
	public async getBusLocation(lineID: string, direction: "Return" | "Arrival"): Promise<BusLocationData[]> {
		return new Promise(async (resolve, reject) => {
			const LineCode: Line | undefined = this.getLineDataFromLineID(lineID)
			if (LineCode) {
				const Routes: Route[] = await this.getRoutesForLine(LineCode.LineCode)
				switch (direction) {
					case "Return":
						let BusLocationsReturn!: BusLocationData[]
						try {
							BusLocationsReturn = await this.GetBusLocationData(Routes[1].route_code)
						} catch (e) {
							reject(e)
						}
						resolve(BusLocationsReturn)
						break;
					case "Arrival":
						let BusLocationsArrival!: BusLocationData[]
						try {
							BusLocationsArrival = await this.GetBusLocationData(Routes[0].route_code)
						} catch (e) {
							reject(e)
						}
						resolve(BusLocationsArrival)
						break;
					
				}
				
			} else {
				console.log(`[Error]: Line ID ${lineID} not found`)
			}
		})
	}
	
	public async getLineIDInfo(lineID: string): Promise<Line | undefined> {
		return new Promise(async (resolve, reject) => {
			const LineCode: Line | undefined = this.getLineDataFromLineID(lineID)
			if (LineCode) {
				resolve(LineCode)
			} else {
				resolve(undefined)
			}
		})
	}
	
	public async getBusStops(lineID: string, direction: "Return" | "Arrival"): Promise<any> {
		return new Promise(async (resolve, reject) => {
			const LineCode: Line | undefined = this.getLineDataFromLineID(lineID)
			if (LineCode) {
				const Routes: Route[] = await this.getRoutesForLine(LineCode.LineCode)
				switch (direction) {
					case "Return":
						const BusStopsR = await this.GetStopsAndDetails(Routes[1].route_code)
						resolve(BusStopsR.stops)
						break;
					case "Arrival":
						//reversed order for 67
						const BusStopsA = await this.GetStopsAndDetails(Routes[0].route_code)
						resolve(BusStopsA.stops)
						break;
					
				}
			} else {
				console.log(`[Error]: Line ID ${lineID} not found`)
			}
		})
	}
	
	private async GetStopsAndDetails(routeId: string): Promise<StopsAndDetails> {
		return new Promise(async (resolve, reject) => {
			axios.get(APIs.GetStopsAndDetails(routeId), {
				headers: {...RequestData, ...this.applyCookies()}
			}).then((response: AxiosResponse) => {
				const phpSessionId: string | undefined = response.headers["set-cookie"] ? response.headers["set-cookie"]!.at(0)!.split(";")[0].replace("PHPSESSID=", "") : undefined
				this.alterCookies(phpSessionId)
				resolve(response.data)
			}).catch((error: AxiosError) => {
				reject(error)
			})
		})
	}
	
	private async getRoutesForLine(LineCode: string): Promise<Route[]> {
		return new Promise(async (resolve, reject) => {
			axios.get(APIs.GetRoutesForLine(LineCode), {
				headers: {...RequestData, ...this.applyCookies()}
			}).then((response: AxiosResponse) => {
				const phpSessionId: string | undefined = response.headers["set-cookie"] ? response.headers["set-cookie"]!.at(0)!.split(";")[0].replace("PHPSESSID=", "") : undefined
				this.alterCookies(phpSessionId)
				resolve(response.data)
			}).catch((error: AxiosError) => {
				console.log("Get Route lines")
				console.log(error)
			})
		})
	}
	
	private async GetBusLocationData(route_code: string): Promise<BusLocationData[]> {
		return new Promise(async (resolve, reject) => {
			if (!this.csrfToken) {
				this.csrfToken = this.generateCSRF()
			}
			const cookieData = this.applyCookies()
			if (cookieData["Cookie"] == "") {
				cookieData["Cookie"] = `PHPSESSID=${await this.getSessionToken()}`;
			}
			axios.get(APIs.GetBusLocation(route_code), {
				headers: {
					...RequestData, ...cookieData, ...{
						"X-CSRF-TOKEN": this.csrfToken,
					}
				}
			}).then(response => {
				const phpSessionId: string | undefined = response.headers["set-cookie"] ? response.headers["set-cookie"]!.at(0)!.split(";")[0].replace("PHPSESSID=", "") : undefined
				this.alterCookies(phpSessionId)
				const jsonRes: BusLocationData[] = response.data
				if (Array.isArray(jsonRes)) {
					resolve(jsonRes)
				}
			}).catch((e: AxiosError) => {
				console.log(e.response!.data)
				if (e.response) {
					reject(`${e.code} | ${e.response.status}`)
				} else {
					reject(`${e.message}`)
				}
			})
		})
	}
	
	private alterCookies(cookie: string | undefined): void {
		if (this.reuseSessions) {
			if (!this.phpSessionId && cookie) {
				console.log("[Session]: Assign", cookie)
				this.phpSessionId = cookie
			}
		} else {
			if (!this.phpSessionId && cookie) {
				console.log("[Session] [NO SESSION REUSE]: Assign", cookie)
				this.phpSessionId = cookie
			} else if (this.phpSessionId) {
				this.phpSessionId = undefined
			}
		}
	}
	
	private applyCookies(): Record<string, string> {
		if (this.reuseSessions) {
			if (!this.phpSessionId) {
				return {
					["Cookie"]: ``
				}
			} else {
				return {
					["Cookie"]: `PHPSESSID=${this.phpSessionId}`
				}
			}
		} else {
			if (!this.phpSessionId) {
				return {
					["Cookie"]: ""
				}
			} else {
				return {
					["Cookie"]: `PHPSESSID=${this.phpSessionId}`
				}
			}
		}
	}
	
	private generateCSRF(): string { /* Please dont kill me. */
		function padZero(number: number) {
			return number < 10 ? '0' + number.toString() : number.toString();
		}
		let n: Date = new Date()
		let greeceDate = new Date(n.toLocaleString('en-US', { timeZone: 'Europe/Athens' }));
		
		let phrase: string = `o@sthW38T3l3m@t!c$$-1${greeceDate.getFullYear() + padZero(greeceDate.getMonth() + 1) + padZero(greeceDate.getDate())}`;
		let sha256 = new JsSHA("SHA-256", "TEXT").update(phrase)
		return sha256.getHash("HEX");
	}
}