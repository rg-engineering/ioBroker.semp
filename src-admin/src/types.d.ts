/* eslint-disable prettier/prettier */
//ist das gleiche interface wie in adapter-config.d.ts

interface EnergyRequest {
    ID: string;
    Days: string;
    EarliestStartTime: string;
    LatestEndTime: string;
    MinRunTime: string;
    MaxRunTime: string;
}

interface WallboxOIDSettings {
    active: boolean;
    must: string;
    Name: string;
    OID: string;
    Type: string;
    SetValue: string;

    //only for read OIDs
    Path2Check: string;
}


interface SempDevice {
    IsActive: boolean;
    ID: string;
    Name: string;

    //main settings
    Vendor: string;
    Serialnumber: string;
    Type: string;
    MinPower: number;
    MaxPower: number;
    InterruptionAllowed: boolean;
    MinOnTime: number;
    MaxOnTime: number;
    MinOffTime: number;
    MaxOffTime: number;

    //counter settings
    MeasurementMethod: string;
    OIDPower: string;
    MeasurementUnit: string;


    //switch settings
    StatusDetectionType: string;
    OIDStatus: string;
    StatusDetectionLimit: number;
    StatusDetectionLimitTimeOn: number;
    StatusDetectionLimitTimeOff: number;
    StatusDetectionMinRunTime: number;
    HasOIDSwitch: boolean;
    OIDSwitch: string;

    //timer settings
    DeviceTimerActive: boolean;
    TimerCancelIfNotOn: boolean;
    TimerCancelIfNotOnTime: string;
    DishwasherMode: boolean;
    EnergyRequests: EnergyRequest[];

    //wallbox settings
    BatteryCapacity: number;
    WallboxChargeTime: string;
    WallboxPhases: string;
    Wallbox3phaseSwitchLimit: number;
    Wallbox3phaseSwitchDelay: number;
    WallboxNeedCurrentRecommendation: boolean;
    wallbox_oid_write: WallboxOIDSettings[];

    URLReadPollRate: number;
    wallbox_oid_read: WallboxOIDSettings[];


}


export interface SempAdapterConfig extends ioBroker.AdapterConfig {
    /** Configuration of the adapter */

    IPAddress: string;
    UUID: string;
    SempPort: number;
    SempName: string;
    SempManufacturer: string;
    extendedLog: boolean;
    LogToCSV: boolean;
    LogToCSVPath: string;

    devices: SempDevice[];

    deviceSelector: string;
}