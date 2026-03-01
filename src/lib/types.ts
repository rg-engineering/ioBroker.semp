export interface iobObject {
    type: string,
    common: {
        name: string,
        role: string,
        type: string,
        unit?: string,
        read: boolean,
        write: boolean,
        desc?: string
    },
    native?: { id: string }
}

export interface EnergyRequestPeriod {
    ID: string;
    Days: string;
    EarliestStartTime: string;
    LatestEndTime: string;
    MinRunTime: string;
    MaxRunTime: string;
}

export interface WallboxOIDSettings {
    active: boolean;
    must: boolean; //just for table in admin
    Name: string;
    OID: string;
    Type: string;
    SetValue: string | number | boolean;
    //only for read OIDs
    Path2Check: string;

    newValue: number;
}

export interface Identification {
    DeviceId: string;
    DeviceName: string;
    DeviceType: string;
    DeviceSerial: string;
    DeviceVendor: string;
}

export interface Characteristics {
    MinPowerConsumption?: number;
    MaxPowerConsumption?: number;
    MinOnTime?: number;
    MaxOnTime?: number;
    MinOffTime?: number;
    MaxOffTime?: number;
}

export interface CurrentPower {
    Method: string;
}

export interface Timestamps {
    AbsoluteTimestamps: boolean;
}
export interface Interruptions {
    InterruptionsAllowed: boolean;
}
export interface Requests {
    OptionalEnergy: boolean;
}

export interface Capabilities {
    CurrentPower: CurrentPower;
    Timestamps: Timestamps;
    Interruptions: Interruptions;
    Requests: Requests;
}

export interface deviceInfo {
    Identification: Identification;
    Characteristics: Characteristics;
    Capabilities: Capabilities;
};

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
    TimerCancelIfNotOnTime: number;
    DishwasherMode: boolean;
    EnergyRequestPeriods: EnergyRequestPeriod[];

    //wallbox settings
    BatteryCapacity: number;
    WallboxChargeTime: number;
    WallboxPhases: number;
    Wallbox3phaseSwitchLimit: number;
    Wallbox3phaseSwitchDelay: number;
    WallboxNeedCurrentRecommendation: boolean;
    wallbox_oid_write: WallboxOIDSettings[];

    URLReadPollRate: number;
    wallbox_oid_read: WallboxOIDSettings[];

    //same as above but different type for easier access in code
    WallboxOID: {
        DeviceOIDPlugConnected?: WallboxOIDSettings | null;
        DeviceOIDIsCharging?: WallboxOIDSettings | null;
        DeviceOIDIsError?: WallboxOIDSettings | null;
        DeviceOIDChargePower?: WallboxOIDSettings | null;
        DeviceOIDStartCharge?: WallboxOIDSettings | null;
        DeviceOIDStopCharge?: WallboxOIDSettings | null;
        DeviceOID3PhaseChargeEnable?: WallboxOIDSettings | null;
        DeviceOID3PhaseChargeDisable?: WallboxOIDSettings | null;
        DeviceOIDCounter?: WallboxOIDSettings | null;
        DeviceOIDStatus?: WallboxOIDSettings | null;
        DeviceOIDSwitch?: WallboxOIDSettings | null;
    }

    SwitchOffAtEndOfTimer: boolean //only used for wallbox

    //just internal use
    OptionalEnergy: boolean;
}