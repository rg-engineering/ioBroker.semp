"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable prefer-template */
const Timeframe_1 = __importDefault(require("./Timeframe"));
const TimeframeWallbox_1 = __importDefault(require("./TimeframeWallbox"));
const base_1 = __importDefault(require("./base"));
class Planningrequest extends base_1.default {
    // Fix: timeframes kann Elemente beider Typen enthalten -> Union-Array
    timeframes;
    settings;
    WallboxPlugConnected;
    constructor(settings, parentadapter) {
        super(parentadapter, 0, "planning request");
        this.settings = settings;
        // Initialisierung als leeres Array des Union-Typs
        this.timeframes = [];
        this.logDebug("planningrequest constructor " + JSON.stringify(settings));
        if (this.settings.Type != "EVCharger") {
            this.CreateTimeframes();
        }
        this.WallboxPlugConnected = false;
    }
    destructor() {
        for (let t = 0; t < this.timeframes.length; t++) {
            this.timeframes[t].destructor();
        }
        this.timeframes = [];
    }
    SetDeviceStatus(status) {
        for (let d = 0; d < this.timeframes.length; d++) {
            this.timeframes[d].SetDeviceStatus(status);
        }
    }
    CreateTimeframes() {
        if (this.settings.EnergyRequestPeriods !== undefined && this.settings.EnergyRequestPeriods != null && this.settings.EnergyRequestPeriods.length > 0) {
            this.logDebug("planningrequest create time frames " + this.settings.EnergyRequestPeriods.length);
            for (let r = 0; r < this.settings.EnergyRequestPeriods.length; r++) {
                const settings = {
                    EnergyRequestPeriod: this.settings.EnergyRequestPeriods[r],
                    DeviceName: this.settings.Name,
                    //SwitchOffAtEndOfTimer: this.settings.SwitchOffAtEndOfTimer
                    //xxx
                    DishWasherMode: this.settings.DishwasherMode,
                };
                this.logDebug("planningrequest " + JSON.stringify(this.settings) + " " + JSON.stringify(settings));
                const timeframe = new Timeframe_1.default(settings, this.adapter);
                // OK: Union-Array akzeptiert Timeframe
                this.timeframes.push(timeframe);
            }
        }
        else {
            this.logWarn("no planning request time frames defined");
        }
    }
    CreateTimeframeWallbox() {
        this.logDebug("planningrequest create time frame for wallbox");
        const settings = {
            EnergyRequestPeriod: null,
            DeviceName: this.settings.Name,
            SwitchOffAtEndOfTimer: this.settings.SwitchOffAtEndOfTimer,
            MaxEnergy: this.settings.MaxEnergy,
            MinEnergy: this.settings.MinEnergy,
            MinPower: this.settings.MinPower,
            MaxPower: this.settings.MaxPower,
            WallboxChargeTime: this.settings.WallboxChargeTime
        };
        this.logDebug("planningrequest " + JSON.stringify(this.settings) + " " + JSON.stringify(settings));
        const timeframe = new TimeframeWallbox_1.default(settings, this.adapter);
        // OK: Union-Array akzeptiert TimeframeWallbox
        this.timeframes.push(timeframe);
    }
    SetMinEnergy(value) {
        if (value >= 0) {
            this.logDebug("planningrequest set minEnergy " + value);
            if (this.timeframes.length > 0) {
                for (let t = 0; t < this.timeframes.length; t++) {
                    // Fix: korrekte Syntax und Cast auf TimeframeWallbox
                    this.timeframes[t].SetMinEnergy(value);
                }
            }
        }
    }
    SetMaxEnergy(value) {
        if (value > 0) {
            this.logDebug("planningrequest set maxEnergy " + value);
            if (this.timeframes.length > 0) {
                for (let t = 0; t < this.timeframes.length; t++) {
                    // Fix: korrekte Syntax und Cast auf TimeframeWallbox
                    this.timeframes[t].SetMaxEnergy(value);
                }
            }
        }
    }
    getPlanningrequestData() {
        const PlanningrequestData = [];
        if (this.WallboxPlugConnected || this.settings.DeviceType != "EVCharger") {
            for (let t = 0; t < this.timeframes.length; t++) {
                const timeframeData = this.timeframes[t].getTimeframeData();
                if (timeframeData != null) {
                    PlanningrequestData.push(timeframeData);
                }
            }
        }
        this.logDebug("planningrequest data " + JSON.stringify(PlanningrequestData));
        return PlanningrequestData;
    }
    getAllTimeframesFinished() {
        let AllFinished = true;
        if (this.timeframes.length > 0) {
            for (let t = 0; t < this.timeframes.length; t++) {
                // Fix: korrekte Syntax und Cast auf TimeframeWallbox
                const val = this.timeframes[t].GetFinished();
                if (val == false) {
                    AllFinished = false;
                }
            }
        }
        return AllFinished;
    }
    Check2Switch() {
        let SwitchOff = false;
        let restart = false;
        if (this.timeframes.length > 0) {
            for (let t = 0; t < this.timeframes.length; t++) {
                const oRet = this.timeframes[t].Check2Switch();
                if (oRet.SwitchOff) {
                    SwitchOff = true;
                }
                if (oRet.restart) {
                    restart = true;
                    //just delete timeframe
                    this.SetPlugConnected(false);
                }
            }
        }
        else {
            SwitchOff = true;
        }
        const ret = {
            SwitchOff: SwitchOff,
            restart: restart
        };
        this.logDebug("Planningrequest Check2Switch " + JSON.stringify(ret));
        return ret;
    }
    CancelActiveTimeframes() {
        for (let t = 0; t < this.timeframes.length; t++) {
            this.timeframes[t].CancelActiveTimeframe();
        }
    }
    //Wallbox
    SetCurrentEnergy(energy) {
        if (this.settings.DeviceType == "EVCharger") {
            this.logDebug("got energy used " + energy);
            for (let t = 0; t < this.timeframes.length; t++) {
                // Fix: korrekte Syntax und Cast auf TimeframeWallbox
                this.timeframes[t].setCurrentEnergy(energy);
            }
        }
    }
    SetPlugConnected(state) {
        if (this.settings.DeviceType == "EVCharger") {
            this.WallboxPlugConnected = state;
            if (state) {
                if (this.timeframes == null || this.timeframes.length == 0) {
                    this.CreateTimeframeWallbox();
                }
            }
            else {
                this.logDebug("Planningrequest all timeframes canceled ");
                for (let t = 0; t < this.timeframes.length; t++) {
                    this.timeframes[t].destructor();
                }
                this.timeframes = [];
            }
        }
    }
    SetMaxChargeTime(state) {
        if (this.settings.DeviceType == "EVCharger") {
            for (let t = 0; t < this.timeframes.length; t++) {
                // Fix: korrekte Syntax und Cast auf TimeframeWallbox
                this.timeframes[t].SetMaxChargeTime(state);
            }
        }
    }
}
exports.default = Planningrequest;
//# sourceMappingURL=Planningrequest.js.map