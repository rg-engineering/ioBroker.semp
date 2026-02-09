// This file extends the AdapterConfig type from "@types/iobroker"


interface EnergyRequestPeriod {
    ID: string;
    Days: string;
    EarliestStartTime: string;
    LatestEndTime: string;
    MinRunTime: number;
    MaxRunTime: number;
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
    SerialNr: string;
    Type: string;
    MinPower: number;
    MaxPower: number;
    InterruptionsAllowed: boolean;
    MinOnTime: number;
    MaxOnTime: number;
    MinOffTime: number;
    MaxOffTime: number;

    //counter settings
    MeasurementMethod: string;
    OID_Power: string;
    MeasurementUnit: string;


    //switch settings
    StatusDetectionType: string;
    OID_Status: string;
    StatusDetectionLimit: number;
    StatusDetectionLimitTimeOn: number;
    StatusDetectionLimitTimeOff: number;
    StatusDetectionMinRunTime: number;
    HasOIDSwitch: boolean;
    OID_Switch: string;

    //timer settings
    TimerActive: boolean;
    TimerCancelIfNotOn: boolean;
    TimerCancelIfNotOnTime: string;
    DishwasherMode: boolean;
    EnergyRequestPeriods: EnergyRequestPeriod[];

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

// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {
		interface AdapterConfig {


            IPAddress: string;
            UUID: string;
            DeviceBaseID: string;
            SempPort: number;
            SempName: string;
            SempManufacturer: string;
            extendedLog: boolean;
            LogToCSV: boolean;
            LogToCSVPath: string;

            devices: SempDevice[];

		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};