export const APIs = {
    ["GetLines"]: "https://telematics.oasth.gr/api/?act=webGetLines",
    ["GetRoutesForLine"]: function(arg: string) {return `https://telematics.oasth.gr/api/?act=getRoutesForLine&p1=${arg}`},
    ["GetStopsAndDetails"]: function(arg: string) {return `https://telematics.oasth.gr/api/?act=webGetRoutesDetailsAndStops&p1=${arg}`},
    ["GetBusLocation"]: function(arg: string) {return `https://telematics.oasth.gr/api/?act=getBusLocation&p1=${arg}`},
    ["getLangs"]: "https://telematics.oasth.gr/api/?act=webGetLangs"
}