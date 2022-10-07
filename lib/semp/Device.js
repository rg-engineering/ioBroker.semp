//const axios = require('axios');


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

*/

class Device {


    /**
     * Creates new device
     */

    constructor(gateway, device) {
        this.Gateway = gateway;
        this.device = device;

        this.deviceInfo = null;
        this.deviceStatus = null;
        //this.ResetIntervalID = null;
        this.planningRequest = {
            Timeframe: []
        };

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

        this.UpdteTimesID = null;
        this.UpdteTimesID = setInterval(this.UpdateTimes.bind(this), 60*1000);
        this.CurrentOnTime = 0;
        this.RemainingMaxOnTime = 0;

        this.getCurrentStates();

        this.StatusDetectionOnTimerID = null;
        this.StatusDetectionOffTimerID = null;
        this.InMinRunTime = false;

    }


    destructor() {
        this.Gateway.parentAdapter.log.debug("destructor called ");
        if (this.UpdteTimesID != null) {
            clearInterval(this.UpdteTimesID);
        }
    }


    async checkRequests() {

        this.Gateway.parentAdapter.log.debug("calculate request times");

        try {
            if (this.device.IsActive && this.device.TimerActive) {

                let id = this.device.ID;
                let earliestStart = 0;
                let latestEnd = 0;
                let minRunTime = 0;
                let maxRunTime = 0;

                let now = new Date();
                let dayOfWeek = now.getDay();

                let start = this.device.TimerStart.split(":");
                let end = this.device.TimerEnd.split(":");
                let minRunTimes = this.device.TimerMinRunTime.split(":");
                let maxRunTimes = this.device.TimerMaxRunTime.split(":");

                let allchecked = true;
                if (start.length != 2) {
                    this.Gateway.parentAdapter.log.error("unsupported time format " + this.device.TimerStart + ", should be hh:mm");
                    allchecked = false;
                }
                if (end.length != 2) {
                    this.Gateway.parentAdapter.log.error("unsupported time format " + this.device.TimerEnd + ", should be hh:mm");
                    allchecked = false;
                }
                if (minRunTimes.length != 2) {
                    this.Gateway.parentAdapter.log.error("unsupported time format " + this.device.TimerMinRunTime + ", should be hh:mm");
                    allchecked = false;
                }
                if (maxRunTimes.length != 2) {
                    this.Gateway.parentAdapter.log.error("unsupported time format " + this.device.TimerMaxRunTime + ", should be hh:mm");
                    allchecked = false;
                }

                //check days
                this.Gateway.parentAdapter.log.debug("check run today " + dayOfWeek + JSON.stringify(this.device));
                let runToday = false;
                if (this.device.TimerEveryDay) {
                    runToday = true;
                }
                else if (this.device.TimerMonday && dayOfWeek == 1) {
                    runToday = true;
                }
                else if (this.device.TimerTuesday && dayOfWeek == 2) {
                    runToday = true;
                }
                else if (this.device.TimerWednesday && dayOfWeek == 3) {
                    runToday = true;
                }
                else if (this.device.TimerThursday && dayOfWeek == 4) {
                    runToday = true;
                }
                else if (this.device.TimerFriday && dayOfWeek == 5) {
                    runToday = true;
                }
                else if (this.device.TimerSaturday && dayOfWeek == 6) {
                    runToday = true;
                }
                else if (this.device.TimerSunday && dayOfWeek == 0) {
                    runToday = true;
                }

                if (allchecked) {

                    if (runToday) {
                        //Start < End check fehlt noch
                        //disable TimerActive fehlt noch
                        let StartTime = new Date();
                        StartTime.setHours(start[0]);
                        StartTime.setMinutes(start[1]);
                        StartTime.setSeconds(0);

                        let EndTime = new Date();
                        EndTime.setHours(end[0]);
                        EndTime.setMinutes(end[1]);
                        EndTime.setSeconds(0);

                        let StartIn = StartTime.getTime() - now.getTime();
                        let EndIn = EndTime.getTime() - now.getTime();

                        if (StartIn < 0) {
                            earliestStart = 0;
                        }
                        else {
                            earliestStart = Math.floor(StartIn / 1000);
                        }

                        if (EndIn < 0) {
                            latestEnd = 0;
                        }
                        else {
                            latestEnd = Math.floor(EndIn / 1000);
                        }

                        minRunTime = (minRunTimes[0] * 60 * 60) + (minRunTimes[1] * 60);
                        maxRunTime = (maxRunTimes[0] * 60 * 60) + (maxRunTimes[1] * 60);

                        //now reduce it by already used OnTime
                        minRunTime = minRunTime - this.CurrentOnTime;
                        maxRunTime = maxRunTime - this.CurrentOnTime;

                        if (minRunTime < 0) minRunTime = 0;
                        if (maxRunTime < 0) maxRunTime = 0;

                        this.Gateway.parentAdapter.log.debug("Start " + StartTime.toLocaleTimeString() + " End " + EndTime.toLocaleTimeString() + " earliest: " + earliestStart + " latest: " + latestEnd + " current on time: " + this.CurrentOnTime);

                        //later: todo find right request in list, now e use only one
                        if (this.getNoOfPlanningRequests() < 1) {
                            if (earliestStart > 0 || latestEnd > 0) {
                                this.addPlanningRequest(earliestStart, latestEnd, minRunTime, maxRunTime);
                            }
                        }
                        else {
                            let reqId = 0; //always the first in list (todo: find the right one if we use more then one)

                            if (earliestStart == 0 && latestEnd == 0) {
                                this.clearPlanningRequests();
                                this.RemainingMaxOnTime = 0;
                                this.CurrentOnTime = 0;

                                await this.SwitchOff();
                            }
                            else {
                                this.updatePlanningRequest(reqId, earliestStart, latestEnd, minRunTime, maxRunTime);
                            }
                        }
                    }
                    else {
                        //what to do if not run today??? todo
                        this.Gateway.parentAdapter.log.debug("nothing to run today");
                    }
                }
                else {
                    this.Gateway.parentAdapter.log.debug("not started due to error on pre-check");
                }
            }
            else {
                //todo something to do?
                this.Gateway.parentAdapter.log.debug("not active");
            }
        }

        catch (e) {
            this.Gateway.parentAdapter.log.error("exception in checkRequests [" + e + "]");
        }
    }

    async SwitchOff() {
        if (this.device.HasOIDSwitch && this.device.SwitchOffAtEndOfTimer) {

            await this.Switch(false);
        }
    }

    async UpdateTimes() {

        //=============================================================
        this.checkRequests();

        //=============================================================
        let val = "00:00";

        if (this.deviceStatus.Status=="On") {
            this.CurrentOnTime = this.CurrentOnTime+60;

        }
        //reset when period is over, with interuptions
        //else {
        //    this.CurrentOnTime = 0;
        //}

        //=============================================================
        let Hour = Math.floor(this.CurrentOnTime / 60 / 60);
        let Minutes = Math.floor((this.CurrentOnTime - (Hour*60*60)) / 60); 
        let sHour = "0";
        if (Hour < 10) {
            sHour = "0" + Hour;
        }
        else {
            sHour = Hour;
        }
        let sMinutes = "0";
        if (Minutes < 10) {
            sMinutes = "0" + Minutes;
        }
        else {
            sMinutes = Minutes;
        }

        val = sHour + ":" + sMinutes; 

        let key = "Devices." + this.device.Name + ".TimeOn";
       

        await this.Gateway.parentAdapter.setStateAsync(key, { ack: true, val: val });

        //=======================================================
        val = "00:00";

        Hour = Math.floor(this.RemainingMaxOnTime / 60 / 60);
        Minutes = Math.floor((this.RemainingMaxOnTime - (Hour*60*60)) / 60);
        sHour = "0";
        if (Hour < 10) {
            sHour = "0" + Hour;
        }
        else {
            sHour = Hour;
        }
        sMinutes = "0";
        if (Minutes < 10) {
            sMinutes = "0" + Minutes;
        }
        else {
            sMinutes = Minutes;
        }

        val = sHour + ":" + sMinutes; 


        key = "Devices." + this.device.Name + ".RemainingMaxOnTime";

        await this.Gateway.parentAdapter.setStateAsync(key, { ack: true, val: val });
    }

    /**
     * Schedules a run
     * @param earliestStart relative time from now that the operation should min start in seconds
     * @param latestEnd relative time from now that the operation has to be finished in seconds
     * @param minRunTime minimum runtime in seconds
     * @param maxRunTime maximum runtime in seconds
     */
    addPlanningRequest(earliestStart, latestEnd, minRunTime, maxRunTime) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " addPlanningRequest " + earliestStart + " " + latestEnd + " " + minRunTime + " " + maxRunTime);

        if (minRunTime > maxRunTime) {
            throw Error("Min run time cant be greater than max run time!");
        }

        for (let frame of this.planningRequest.Timeframe) {
            if (latestEnd < frame.LatestEnd && latestEnd > frame.EarliestStart || earliestStart < frame.LatestEnd && earliestStart > frame.EarliestStart) {
                throw Error("Overlapping timeframes arent valid!")
            }
        }

        let timeframeid = this.planningRequest.Timeframe.length;
        timeframeid = timeframeid + 1;

        let timeframe = {
            //TimeframeId: timeframeid,
            DeviceId: this.deviceInfo.Identification.DeviceId,
            EarliestStart: earliestStart,
            LatestEnd: latestEnd,
            MinRunningTime: minRunTime,
            MaxRunningTime: maxRunTime
        };

        this.planningRequest.Timeframe.push(timeframe);
    }

    updatePlanningRequest(timeframeId, earliestStart, latestEnd, minRunTime, maxRunTime) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " updatePlanningRequest " + timeframeId + " " + earliestStart + " " + latestEnd + " " + minRunTime + " " + maxRunTime );

        this.planningRequest.Timeframe[timeframeId].EarliestStart = earliestStart;
        this.planningRequest.Timeframe[timeframeId].LatestEnd = latestEnd;
        this.planningRequest.Timeframe[timeframeId].MinRunningTime = minRunTime;
        this.planningRequest.Timeframe[timeframeId].MaxRunningTime = maxRunTime;


        if (earliestStart == 0 && latestEnd > 0) {
            this.RemainingMaxOnTime = latestEnd;
        }
        else {
            this.RemainingMaxOnTime = 0;
        }
    }

    /**
     * Clears all planning requests
     */
    clearPlanningRequests() {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " clearPlanningRequests");

        this.planningRequest.Timeframe = [];
    }

    getPlanningRequests() {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " getPlanningRequests");

        return this.planningRequest.Timeframe;
    }

    getNoOfPlanningRequests() {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " getNoOfPlanningRequests " + this.planningRequest.Timeframe.length);

        return this.planningRequest.Timeframe.length;
    }

    /**
     * Sets average power of last 60s interval
     * @param watts Power in W
     * @param minPower minimum power in interval
     * @param maxPower maximum power in interval
     */
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
    }

    async sendEMRecommendation(em2dev) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " received recommendation " + JSON.stringify(em2dev) + " " + JSON.stringify(this.lastRecommendation));

        if (this.lastRecommendation == null || this.lastRecommendation.DeviceControl.On != em2dev.DeviceControl.On) {
            // todo if power recemendation

            await this.setRecommendationState(em2dev.DeviceControl.On);
        }

        await this.setRecommendation(em2dev.DeviceControl.On);

        //if (this.ResetIntervalID) {
        //    clearTimeout(this.ResetIntervalID);
        //    this.ResetIntervalID = null;
        //}
        //nach 2 Minuten zurückstezen falls kein weiteres update kommt
        //this.ResetIntervalID = setTimeout(this.ResetRecommendation.bind(this), 2 * 60 * 1000);

        this.lastRecommendation = em2dev;
    }


    
    /*
    async ResetRecommendation() {

        if (this.ResetIntervalID) {
            clearTimeout(this.ResetIntervalID);
            this.ResetIntervalID = null;
        }

        this.Gateway.parentAdapter.log.debug(this.device.Name + " reset recommendation after timeout ");
        this.setRecommendationState(false);
        await this.setRecommendation(false);
    }
    */

    async setRecommendationState(value) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " new recommendation " + value);

        let key = "Devices." + this.device.Name + ".RecommendedState";
        await this.Gateway.parentAdapter.setStateAsync(key, { ack: true, val: value });
        key = "Devices." + this.device.Name + ".Changed";
        let now = new Date();
        await this.Gateway.parentAdapter.setStateAsync(key, { ack: true, val: now.toLocaleTimeString() });
    }

    async setRecommendation(value) {

        if (this.device.HasOIDSwitch) {

            this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " set new recommendation state" + value);

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
                    this.CurrentOnTime = (vals[0] * 60 * 60) + (vals[1] * 60);
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




     static timeSecs() {
        return Math.round(new Date().getTime() / 1000)
    }
}

module.exports = {
    Device
};