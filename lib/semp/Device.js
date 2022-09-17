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

*/

class Device {


    /**
     * Creates new device
     * @param deviceId Device ID. Formatting is explained in SEMP docs: F-11223344-112233445566-00
     * @param name Name
     * @param type Type of device: See SEMP docs
     * @param measurementMethod Enum: {Measurement, Estimation, None}
     * @param interruptionsAllowed If device can be interrupted while running
     * @param maxPower Maximum power draw
     * @param emSignalsAccepted If signals of the EM are currently being considered
     * @param status On, Off, Offline
     * @param vendor Vendor
     * @param serialNr Serial Nr of device
     * @param absoluteTimestamps True if device uses absoulte Timestamps since 1970
     * @param optionalEnergy If device can consume more energy than needed (ex. battery)
     * @param minOnTime Minimum time that the device has to stay on
     * @param minOffTime

     */

    /*
    constructor(gateway, deviceId, name, type, measurementMethod, interruptionsAllowed,
        maxPower, emSignalsAccepted, status, vendor, serialNr, absoluteTimestamps,
        optionalEnergy = false, minOnTime, minOffTime) {
    */

    constructor(gateway, device) {
        this.Gateway = gateway;
        this.device = device;

        this.deviceInfo = null;
        this.deviceStatus = null;
        this.planningRequest = {
            Timeframe: []
        };

        this.lastRecommendation;

        //todo
        device.OptionalEnergy = true;

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

    }

    /**
     * Schedules a run
     * @param earliestStart relative time from now that the operation should min start in seconds
     * @param latestEnd relative time from now that the operation has to be finished in seconds
     * @param minRunTime minimum runtime in seconds
     * @param maxRunTime maximum runtime in seconds
     */
    addPlanningRequest(earliestStart, latestEnd, minRunTime, maxRunTime) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " addPlanningRequest");

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
            TimeframeId: timeframeid,
            DeviceId: this.deviceInfo.Identification.DeviceId,
            EarliestStart: earliestStart,
            LatestEnd: latestEnd,
            MinRunningTime: minRunTime,
            MaxRunningTime: maxRunTime
        };

        this.planningRequest.Timeframe.push(timeframe);
    }

    updatePlanningRequest(timeframeId, earliestStart, latestEnd, minRunTime, maxRunTime) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " updatePlanningRequest " + timeframeId);

        this.planningRequest.Timeframe[timeframeId].EarliestStart = earliestStart;
        this.planningRequest.Timeframe[timeframeId].LatestEnd = latestEnd;
        this.planningRequest.Timeframe[timeframeId].MinRunningTime = minRunTime;
        this.planningRequest.Timeframe[timeframeId].MaxRunningTime = maxRunTime;

        //todo
        //this.canConsumeOptionalEnergy();
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

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " getNoOfPlanningRequests");

        return this.planningRequest.Timeframe.length;
    }


    /**
     * Sets average power of last 60s interval
     * @param watts Power in W
     * @param minPower minimum power in interval
     * @param maxPower maximum power in interval
     */
    setLastPower(watts, minPower, maxPower, devicedetection) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " setLastPower " + watts + " " + typeof watts);

        if (devicedetection == "FromPowerValue") {
            if (watts > 0) {
                this.setOnOff("On");
            }
            else {
                this.setOnOff("Off");
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

    setOnOff(state) {
        //could be On, Off, Offline
        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " setState " + state);
        this.deviceStatus.Status = state;
    }


    sendEMRecommendation(em2dev) {

        this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " received recommendation " + JSON.stringify(em2dev) + " " + JSON.stringify(this.lastRecommendation));

        if (this.lastRecommendation == null || this.lastRecommendation.DeviceControl.On != em2dev.DeviceControl.On) {
            // todo if power recemendation

            this.Gateway.parentAdapter.log.debug(this.deviceInfo.Identification.DeviceId + " new recommendation " + em2dev.DeviceControl.On);

            let key = "Devices." + this.device.Name + ".State";
            this.Gateway.parentAdapter.setState(key, { ack: true, val: em2dev.DeviceControl.On });
            key = "Devices." + this.device.Name + ".Changed";
            let now = new Date();
            this.Gateway.parentAdapter.setState(key, { ack: true, val: now.toLocaleTimeString() });
        }

        this.Gateway.parentAdapter.log.debug("111");

        if (this.device.HasOIDSwitch) {

            this.Gateway.parentAdapter.log.debug("222");

            //get current state, if differnt set it
            this.Gateway.parentAdapter.getForeignState(this.device.OID_Switch, function (err, obj) {

                this.Gateway.parentAdapter.log.debug("got state " + JSON.stringify(obj));

                if (err) {

                    this.Gateway.parentAdapter.log.error(err);
                }
                else if (obj != null && obj.val != em2dev.DeviceControl.On) {

                    this.Gateway.parentAdapter.setForeignState(this.device.OID_Switch, em2dev.DeviceControl.On)
                }
            });
        }


        this.lastRecommendation = em2dev;

    }

    async createObjects() {

        let key = "Devices." + this.device.Name + ".State";
        let obj = {
            type: "state",
            common: {
                name: "State",
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
                role: "Time",
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


    subscribe() {
        if (this.device.MeasurementMethod == "Measurement") {
            if (this.device.OID_Power != null && this.device.OID_Power.length > 5) {
                this.Gateway.parentAdapter.log.debug("subscribe OID_Power " + this.device.OID_Power);
                this.Gateway.parentAdapter.subscribeForeignStates(this.device.OID_Power);

                //and get last value
                let current = this.Gateway.parentAdapter.getForeignState(this.device.OID_Power, function () {
                    if (current != null && current.val != null) {
                        this.setPowerDevice(current.val, this.device.StatusDetection);
                    }
                });
            }
        }



        if (this.device.StatusDetection == "SeparateOID") {
            if (this.device.OID_OnOff != null && this.device.OID_OnOff.length > 5) {
                this.Gateway.parentAdapter.log.debug("subscribe OID_Status " + this.device.OID_Status);
                this.Gateway.parentAdapter.subscribeForeignStates(this.device.OID_Status);

                //and get last value
                let current = this.Gateway.parentAdapter.getForeignState(this.device.OID_Status, function () {
                    if (current != null && current.val != null) {
                        this.setOnOffDevice(current.val);
                    }
                });
            }
        }
    }


    /*
     * todo
    canConsumeOptionalEnergy(now) {
        if (isEvCharger()) {
            return ((ElectricVehicleCharger) this.control).isUseOptionalEnergy();
        }
        else if (schedules != null) {
            for (Schedule schedule : schedules) {
                if (schedule.getRequest() != null
                    && schedule.getRequest().getMin(now) != null
                    && schedule.getRequest().getMax(now) > schedule.getRequest().getMin(now)) {
                    return true;
                }
            }
        }
        return false;
    }
    */


     static timeSecs() {
        return Math.round(new Date().getTime() / 1000)
    }
}

module.exports = {
    Device
};