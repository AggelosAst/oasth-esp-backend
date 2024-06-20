export type StopsAndDetails = {
    details: Details[],
    stops: Stop[],
}
export type Details = {
    /* Bus stop x,y cords */
    routed_x: string,
    routed_y: string,
    routed_order: string
}
export type Stop = {
    StopCode: string;
    StopID: string;
    StopDescr: string | null;
    StopDescrEng: string;
    StopStreet: string;
    StopStreetEng: string | null;
    StopHeading: string;
    StopLat: string;
    StopLng: string;
    RouteStopOrder: string;
    StopType: string;
    /* Amea assistance available in bus stops (Heh, clearly not in greece.)  */
    StopAmea: string;
}