// This file extends the AdapterConfig type from "@types/iobroker"


interface Identification {
    DeviceId: device.ID,
    DeviceName: device.Name,
    DeviceType: device.Type,
    DeviceSerial: device.SerialNr,
    DeviceVendor: device.Vendor
}

interface Characteristics {
    MinPowerConsumption?: number ,
    MaxPowerConsumption?: number,
    MinOnTime?: number,
    MaxOnTime?: number,
    MinOffTime?: number,  
    MaxOffTime?: number,
}
interface CurrentPower{
    Method: string,
}

interface Timestamps {
    AbsoluteTimestamps: boolean,
}
interface Interruptions {
    InterruptionsAllowed: boolean,
}

interface Requests {
    OptionalEnergy: boolean,
}

interface Capabilities {
    CurrentPower: CurrentPower,
    Timestamps: Timestamps,
    Interruptions: Interruptions,
    Requests: Requests,
}

export interface deviceInfo {
    Identification: Identification,
    Characteristics: Characteristics
    Capabilities: Capabilities
};



interface EnergyRequestPeriod {
    ID: string;
    Days: string;
    EarliestStartTime: string;
    LatestEndTime: string;
    MinRunTime: number;
    MaxRunTime: number;
}

export interface WallboxOIDSettings {
    active: boolean;
    must: string;
    Name: string;
    OID: string;
    Type: string;
    SetValue: string;

    //only for read OIDs
    Path2Check: string;
}




export interface SempDevice {
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
    WallboxPhases: number;
    Wallbox3phaseSwitchLimit: number;
    Wallbox3phaseSwitchDelay: number;
    WallboxNeedCurrentRecommendation: boolean;
    wallbox_oid_write: WallboxOIDSettings[];

    URLReadPollRate: number;
    wallbox_oid_read: WallboxOIDSettings[];

    //same as above but different type for easier access in code
    WallboxOID: {
        DeviceOIDPlugConnected?: WallboxOIDSettings | null,
        DeviceOIDIsCharging?: WallboxOIDSettings | null,
        DeviceOIDIsError?: WallboxOIDSettings | null,
        DeviceOIDChargePower?: WallboxOIDSettings | null,
        DeviceOIDStartCharge?: WallboxOIDSettings | null,
        DeviceOIDStopCharge?: WallboxOIDSettings | null,
        DeviceOID3PhaseChargeEnable?: WallboxOIDSettings | null,
        DeviceOID3PhaseChargeDisable?: WallboxOIDSettings | null,
        DeviceOIDCounter?: WallboxOIDSettings | null,
        DeviceOIDStatus?: WallboxOIDSettings | null,
        DeviceOIDSwitch?: WallboxOIDSettings | null
    }

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