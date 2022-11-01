
/*

admin

DeviceIsActive						devices[id].IsActive
DeviceID 							devices[id].ID
DeviceVendor						devices[id].Vendor
DeviceName							devices[id].Name
DeviceType							devices[id].Type
DeviceSerialnumber					devices[id].SerialNr
DeviceMaxPower						devices[id].MaxPower
DeviceInterruptionAllowed			devices[id].InterruptionsAllowed
DeviceMinOnTime						devices[id].MinOnTime
DeviceMaxOnTime						devices[id].MaxOnTime
DeviceMinOffTime					devices[id].MinOffTime
DeviceMaxOffTime					devices[id].MaxOffTime
DeviceMeasurementMethod				devices[id].MeasurementMethod
DeviceOIDPower						devices[id].OID_Power
DeviceStatusDetectionType			devices[id].StatusDetection
DeviceOIDStatus						devices[id].OID_Status
DeviceHasOIDSwitch					devices[id].HasOIDSwitch
DeviceOIDSwitch						devices[id].OID_Switch
DeviceTimerActive					devices[id].TimerActive
DeviceTimerStart					devices[id].TimerStart
DeviceTimerEnd						devices[id].TimerEnd
DeviceTimerDays						devices[id].TimerDays
DeviceTimerMinRunningtime			devices[id].TimerMinRunTime
DeviceTimerMaxRunningtime			devices[id].TimerMaxRunTime

DeviceStatusDetectionLimit          devices[id].StatusDetectionLimit
DeviceStatusDetectionLimitTimeOn    devices[id].StatusDetectionLimitTimeOn
DeviceStatusDetectionLimitTimeOff   devices[id].StatusDetectionLimitTimeOff
DeviceStatusDetectionMinRunTime     devices[id].StatusDetectionMinRunTime

DeviceSwitchOffAtEndOfTimer         devices[id].SwitchOffAtEndOfTimer

//cancel request: see issue #14
DeviceTimerCancelIfNotOn            devices[id].TimerCancelIfNotOn
DeviceTimerCancelIfNotOnTime        devices[id].TimerCancelIfNotOnTime

//energy request list
table EnergyRequestPeriods          devices[id].EnergyRequestPeriods
    -> ID
    -> Days
    -> EarliestStartTime
    -> LatestEndTime
    -> MinRunTime
    -> MaxRunTime



*/


/*
todo
* request canceln, wenn gerät nicht an ... oder schon wieder aus 
 * currentOnTime speichern und bei adapterstart holen
 * DP TimeOn und RemainingMaxOnTime füllen
* TimerCancelIfNotOn nur einmal pro device einstellen -> auch in admin


*/

const { Planningrequest } = require("./Planningrequest");



class Device {


    /**
     * Creates new device
     */

    constructor(gateway, device) {
        this.Gateway = gateway;
        this.device = device;

        this.deviceInfo = null;
        this.deviceStatus = null;

        let planningrequestsSettings = {
            EnergyRequestPeriods: this.device.EnergyRequestPeriods,
            SwitchOffAtEndOfTimer: this.device.SwitchOffAtEndOfTimer
        }

        this.planningrequest = new Planningrequest(planningrequestsSettings, this.Gateway.parentAdapter);

        this.lastRecommendation;

        if (device.ID.length < 25) {
            this.Gateway.parentAdapter.log.error("wrong device id " + device.ID + "! must follow F-xxxxxxxx-yyyyyyyyyyyy-zz");
        }

        //muss true sein, um das entsprechende Menü im portal zu bekommen
        device.OptionalEnergy = this.GetOptionalEnergy();

        this.deviceInfo = {
            Identification: {
                DeviceId: device.ID,
                DeviceName: device.Name,
                DeviceType: device.Type,
                DeviceSerial: device.SerialNr,
                DeviceVendor: device.Vendor
            },
            Characteristics: {
                MaxPowerConsumption: device.MaxPower
            },
            Capabilities: {
                CurrentPower: { Method: device.MeasurementMethod },
                Timestamps: { AbsoluteTimestamps: false },
                Interruptions: { InterruptionsAllowed: device.InterruptionsAllowed },
                Requests: { OptionalEnergy: device.OptionalEnergy },
            }
        };

        //if (url) {
        //    this.deviceInfo.Identification.DeviceURL = null;
        //}
        if (device.MinOnTime) {
            this.deviceInfo.Characteristics.MinOnTime = device.MinOnTime;
        }
        if (device.MaxOnTime) {
            this.deviceInfo.Characteristics.MaxOnTime = device.MaxOnTime;
        }
        if (device.MinOffTime) {
            this.deviceInfo.Characteristics.MinOffTime = device.MinOffTime;
        }
        if (device.MaxOffTime) {
            this.deviceInfo.Characteristics.MaxOffTime = device.MaxOffTime;
        }

        this.deviceStatus = {
            DeviceId: device.ID,
            EMSignalsAccepted: true,
            Status: "Off",
        };

        this.subscribe();

        this.createObjects();

        this.Gateway.parentAdapter.log.debug("device created " + device.ID);

        this.getCurrentStates();

        this.StatusDetectionOnTimerID = null;
        this.StatusDetectionOffTimerID = null;
        this.InMinRunTime = false;

        this.CancelRequestTimerID = null;
    }


    destructor() {
        this.Gateway.parentAdapter.log.debug("destructor called ");

        if (this.CancelRequestTimerID) {
            clearTimeout(this.CancelRequestTimerID);
            this.CancelRequestTimerID = null;
        }
    }


    async Check2Switch() {

        let switchOff = await this.planningrequest.Check2Switch();

        if (switchOff) {
            await this.SwitchOff();
        }

    }

    async SwitchOff() {

        this.Gateway.parentAdapter.log.debug("turn device off");

        await this.Switch(false);
    }

    setLastPower(watts, minPower, maxPower) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " setLastPower " + watts + " " + typeof watts + " " + this.device.StatusDetection);

        if (this.device.StatusDetection == "FromPowerValue") {

            //limit festlegen, 1 Watt könnte standby sein
            let limit = 0;
            if (typeof this.device.StatusDetectionLimit != undefined && this.device.StatusDetectionLimit != null && Number(this.device.StatusDetectionLimit) > 0) {
                limit = Number(this.device.StatusDetectionLimit);
                this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " set status detection limit to " + limit);
            }



            if (watts > limit) {
                if (typeof this.device.StatusDetectionLimitTimeOn != undefined && this.device.StatusDetectionLimitTimeOn != null && Number(this.device.StatusDetectionLimitTimeOn) > 0) {

                    this.Gateway.parentAdapter.log.debug("status detection time limit is " + this.device.StatusDetectionLimitTimeOn + " going to on");
                    //going to on
                    if (this.deviceStatus.Status == "On" || this.StatusDetectionOnTimerID != null) {
                        //nothing to do, already true or timer started
                    }
                    else {
                        this.StatusDetectionOnTimerID = setTimeout(this.SetStatusOn.bind(this), this.device.StatusDetectionLimitTimeOn * 60 * 1000);
                        this.Gateway.parentAdapter.log.debug("start setStatusOn - timer");
                    }
                    if (this.StatusDetectionOffTimerID) {
                        this.Gateway.parentAdapter.log.debug("cancel setStatusOff - timer");
                        clearTimeout(this.StatusDetectionOffTimerID);
                        this.StatusDetectionOffTimerID = null;
                    }
                }
                else {
                    this.setOnOff("On");
                }

                if (typeof this.device.StatusDetectionMinRunTime != undefined && this.device.StatusDetectionMinRunTime != null && Number(this.device.StatusDetectionMinRunTime) > 0) {
                    this.StatusDetectionMinRunTimerID = setTimeout(this.ResetMinRunTime.bind(this), this.device.StatusDetectionMinRunTime * 60 * 1000);
                    this.InMinRunTime = true;
                }

            }
            else {
                if (!this.InMinRunTime) {
                    if (typeof this.device.StatusDetectionLimitTimeOff != undefined && this.device.StatusDetectionLimitTimeOff != null && Number(this.device.StatusDetectionLimitTimeOff) > 0) {

                        this.Gateway.parentAdapter.log.debug("status detection time limit is " + this.device.StatusDetectionLimitTimeOff + " going to off");
                        //going to off
                        if (this.deviceStatus.Status == "Off" || this.StatusDetectionOffTimerID != null) {
                            //nothing to do, already false or timer started
                        }
                        else {
                            this.StatusDetectionOffTimerID = setTimeout(this.SetStatusOff.bind(this), this.device.StatusDetectionLimitTimeOff * 60 * 1000);
                            this.Gateway.parentAdapter.log.debug("start setStatusOff - timer");
                        }
                        if (this.StatusDetectionOnTimerID) {
                            this.Gateway.parentAdapter.log.debug("cancel setStatusOn - timer");
                            clearTimeout(this.StatusDetectionOnTimerID);
                            this.StatusDetectionOnTimerID = null;
                        }
                    }
                    else {
                        this.setOnOff("Off");
                    }
                }
                else {
                    this.Gateway.parentAdapter.log.debug("still in min run time... not to switch off");
                }
            }

        }
        let powerInfo = {
            AveragePower: Math.round(watts),
            Timestamp: 0,
            AveragingInterval: 60
        };

        if (maxPower) {
            powerInfo.MaxPower = Math.round(maxPower);
        }
        if (minPower) {
            powerInfo.MinPower = Math.round(minPower);
        }

        this.deviceStatus.PowerConsumption = {
            PowerInfo: [powerInfo]
        };

    }

    ResetMinRunTime() {
        this.InMinRunTime = false;
    }

    SetStatusOn() {
        clearTimeout(this.StatusDetectionOnTimerID);
        this.StatusDetectionOnTimerID = null;
        this.setOnOff("On");
    }
    SetStatusOff() {
        clearTimeout(this.StatusDetectionOffTimerID);
        this.StatusDetectionOffTimerID = null;
        this.setOnOff("Off");
    }

    setOnOff(state) {
        //could be On, Off, Offline
        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " setState " + state);
        this.deviceStatus.Status = state;

        this.planningrequest.SetDeviceStatus(state);

        if (state == "On") {
            //cancel timer if running
            if (this.CancelRequestTimerID) {
                clearTimeout(this.CancelRequestTimerID);
                this.CancelRequestTimerID = null;
            }
        }
    }

    async sendEMRecommendation(em2dev) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " received recommendation " + JSON.stringify(em2dev) + " " + JSON.stringify(this.lastRecommendation));

        if (this.lastRecommendation == null || this.lastRecommendation.DeviceControl.On != em2dev.DeviceControl.On) {
            // todo if power recemendation

            await this.setRecommendationState(em2dev.DeviceControl.On);
        }

        await this.setRecommendation(em2dev.DeviceControl.On);

        this.StartCancelRequest(em2dev.DeviceControl.On);

        this.lastRecommendation = em2dev;
    }

    StartCancelRequest(value) {
        //TimerCancelIfNotOn
        //TimerCancelIfNotOnTime

        if (value) {
            if (this.device.TimerCancelIfNotOn != null && this.device.TimerCancelIfNotOn) {

                if (this.device.TimerCancelIfNotOnTime != null && Number(this.device.TimerCancelIfNotOnTime) > 0) {

                    if (this.CancelRequestTimerID) {
                        clearTimeout(this.CancelRequestTimerID);
                        this.CancelRequestTimerID = null;
                    }
                    this.CancelRequestTimerID = setTimeout(this.CancelRequest.bind(this), Number(this.device.TimerCancelIfNotOnTime) * 60 * 1000);
                }
                else {
                    this.Gateway.parentAdapter.log.warn(this.device.Name + " invalid time to cancel energy request " + JSON.stringify(this.device.TimerCancelIfNotOnTime));
                }
            }
        }
        else {
            //cancel timer if running
            if (this.CancelRequestTimerID) {
                clearTimeout(this.CancelRequestTimerID);
                this.CancelRequestTimerID = null;
            }
        }
    }

    CancelRequest() {

        this.Gateway.parentAdapter.log.debug(this.device.Name + "cancel energy request because device is not switched on");

        this.planningrequest.CancelActiveTimeframe();
        //switch device off
        this.SwitchOff();
    }

    async setRecommendationState(value) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " new recommendation " + value);

        let key = "Devices." + this.device.Name + ".RecommendedState";
        await this.Gateway.parentAdapter.setStateAsync(key, { ack: true, val: value });
        key = "Devices." + this.device.Name + ".Changed";
        let now = new Date();
        await this.Gateway.parentAdapter.setStateAsync(key, { ack: true, val: now.toLocaleTimeString("de-DE") });
    }

    async setRecommendation(value) {

        if (this.device.HasOIDSwitch) {

            this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " set new recommendation state to " + value);

            await this.Switch(value);
        }
    }

    async Switch(value) {
        //get current state, if differnt set it
        let curVal = await this.Gateway.parentAdapter.getForeignStateAsync(this.device.OID_Switch);

        this.Gateway.parentAdapter.log.debug("got state " + JSON.stringify(curVal));

        if (curVal != null && curVal.val != value) {

            this.Gateway.parentAdapter.log.debug(this.device.OID_Switch + " set state " + value);
            await this.Gateway.parentAdapter.setForeignStateAsync(this.device.OID_Switch, value);
        }
    }

    async getCurrentStates() {

        try {
            //holen von TimeOn vom state, damit wert nach reboot nicht verloren geht...
            let key = "Devices." + this.device.Name + ".TimeOn";
            let curVal = await this.Gateway.parentAdapter.getStateAsync(key);

            if (curVal != null) {
                let vals = curVal.val.split(":");
                if (vals.length > 1) {

                    //todo

                }
            }

            //holen von State und setzen, damit OnTime richtig berechnet wird
            key = "Devices." + this.device.Name + ".RecommendedState";
            curVal = await this.Gateway.parentAdapter.getStateAsync(key);
            //not used yet
        }
        catch (e) {
            this.Gateway.parentAdapter.log.error("exception in getCurrentStates [" + e + "]");
        }
    }

    async createObjects() {

        let key = "Devices." + this.device.Name + ".RecommendedState";
        let obj = {
            type: "state",
            common: {
                name: "RecommendedState",
                type: "boolean",
                role: "state",
                read: true,
                write: false
            }
        };
        await this.CreateObject(key, obj);

        key = "Devices." + this.device.Name + ".Changed";
        obj = {
            type: "state",
            common: {
                name: "State",
                type: "string",
                role: "value.time",
                read: true,
                write: false
            }
        };
        await this.CreateObject(key, obj);


        key = "Devices." + this.device.Name + ".TimeOn";
        obj = {
            type: "state",
            common: {
                name: "TimeOn",
                type: "string",
                role: "value.time",
                unit: "hh:mm",
                read: true,
                write: false
            }
        };
        await this.CreateObject(key, obj);

        key = "Devices." + this.device.Name + ".RemainingMaxOnTime";
        obj = {
            type: "state",
            common: {
                name: "RemainingMaxOnTime",
                type: "string",
                role: "value.time",
                unit: "hh:mm",
                read: true,
                write: false
            }
        };
        await this.CreateObject(key, obj);

    }


    async CreateObject(key, obj) {

        const obj_new = await this.Gateway.parentAdapter.getObjectAsync(key);
        //adapter.log.warn("got object " + JSON.stringify(obj_new));

        if (obj_new != null) {

            if ((obj_new.common.role != obj.common.role
                || obj_new.common.type != obj.common.type
                || (obj_new.common.unit != obj.common.unit && obj.common.unit != null)
                || obj_new.common.read != obj.common.read
                || obj_new.common.write != obj.common.write
                || obj_new.common.name != obj.common.name)
                && obj.type === "state"
            ) {
                this.Gateway.parentAdapter.log.warn("change object " + JSON.stringify(obj) + " " + JSON.stringify(obj_new));
                await this.Gateway.parentAdapter.extendObject(key, {
                    common: {
                        name: obj.common.name,
                        role: obj.common.role,
                        type: obj.common.type,
                        unit: obj.common.unit,
                        read: obj.common.read,
                        write: obj.common.write
                    }
                });
            }
        }
        else {
            await this.Gateway.parentAdapter.setObjectNotExistsAsync(key, obj);
        }
    }


    async subscribe() {
        if (this.device.MeasurementMethod == "Measurement") {
            if (this.device.OID_Power != null && this.device.OID_Power.length > 5) {
                this.Gateway.parentAdapter.log.debug("subscribe OID_Power " + this.device.OID_Power);
                this.Gateway.parentAdapter.subscribeForeignStates(this.device.OID_Power);

                //and get last value
                let current = await this.Gateway.parentAdapter.getForeignStateAsync(this.device.OID_Power);
                if (current != null && current.val != null) {
                    this.setLastPower(current.val, 0, 0);
                }
            }
            else {
                this.Gateway.parentAdapter.log.warn("no OID_Power specified " + this.device.OID_Power);
            }
        }

        if (this.device.StatusDetection == "SeparateOID") {
            if (this.device.OID_Status != null && this.device.OID_Status.length > 5) {
                this.Gateway.parentAdapter.log.debug("subscribe OID_Status " + this.device.OID_Status);
                this.Gateway.parentAdapter.subscribeForeignStates(this.device.OID_Status);

                //and get last value
                let current = await this.Gateway.parentAdapter.getForeignStateAsync(this.device.OID_Status);
                if (current != null && current.val != null) {

                    if (current.val) {
                        this.setOnOff("On");
                    }
                    else {
                        this.setOnOff("Off");
                    }
                }

            }
            else {
                this.Gateway.parentAdapter.log.warn("no OID_Status specified " + this.device.OID_Status);
            }
        }
    }


    GetOptionalEnergy() {

        let bRet = false;

        if (this.device.HasOIDSwitch) {
            bRet = true;
        }
        if (this.device.Type == "EVCharger") {
            bRet = true;
        }
        if (this.device.StatusDetection == "AlwaysOn") {
            bRet = false;
        }

        this.Gateway.parentAdapter.log.debug("can use optional energy: " + bRet);

        return bRet;
    }
}

module.exports = {
    Device
};