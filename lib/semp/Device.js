
/*

admin

DeviceIsActive						devices[id].IsActive
DeviceID 							devices[id].ID
DeviceVendor						devices[id].Vendor
DeviceName							devices[id].Name
DeviceType							devices[id].Type
DeviceSerialnumber					devices[id].SerialNr
DeviceMaxPower						devices[id].MaxPower
DeviceMinPower						devices[id].MinPower
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
DeviceMeasurementUnit				devices[id].MeasurementUnit


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

//wallbox
DeviceBatteryCapacity               devices[id].BatteryCapacity

DeviceOIDPlugConnected              devices[id].OID_PlugConnected
DeviceOIDIsCharging                 devices[id].OID_IsCharging
DeviceOIDIsError                    devices[id].OID_IsError
DeviceOIDChargePower                devices[id].OID_ChargePower
DeviceOIDStartCharge                devices[id].OID_StartCharge
DeviceOIDStopCharge                 devices[id].OID_StopCharge


*/


/*
todo
* request canceln, wenn gerät   schon wieder aus 
 * currentOnTime speichern und bei adapterstart holen

                                    State "semp.0.Devices.Trockner.State" has no existing object, this might lead to an error in future versions
	2022-12-24 09:05:55.141	warn	State "semp.0.Devices.Aquarium.State" has no existing object, this might lead to an error in future versions
	2022-12-24 09:05:55.140	warn	State "semp.0.Devices.Waschmaschine.State" has no existing object, this might lead to an error in future versions
	2022-12-24 09:05:55.139	warn	State "semp.0.Devices.Trockner.State" has no existing object, this might lead to an error in future versions
	2022-12-24 09:05:55.138	warn	State "semp.0.Devices.Aquarium.State" has no existing object, this might lead to an error in future versions
	2022-12-24 09:05:55.137	warn	State "semp.0.Devices.Waschmaschine.State" has no existing object, this might lead to an error in future versions

*/

const { Planningrequest } = require("./Planningrequest");



class Device {


    /**
     * Creates new device
     */

    constructor(gateway,
        device,
        logger) {

        this.Gateway = gateway;
        this.device = device;

        this.deviceInfo = null;
        this.deviceStatus = null;
        this.EnergyData = {
            lastTimestamp: -99,
            SumEnergy: 0
        }

        this.logger = logger;

        let planningrequestsSettings = {
            EnergyRequestPeriods: this.device.EnergyRequestPeriods,
            SwitchOffAtEndOfTimer: this.device.SwitchOffAtEndOfTimer,
            DeviceName: device.Name,
            DeviceType: device.Type,
            MaxEnergy: device.BatteryCapacity,
            MinEnergy: 0.1*device.BatteryCapacity
        }

        this.planningrequest = null;

        if (this.device.TimerActive || device.Type == "EVCharger") {
            this.planningrequest = new Planningrequest(planningrequestsSettings, this.Gateway.parentAdapter);
        }

        this.lastRecommendation;

        if (typeof device.ID == undefined || device.ID.length < 25) {
            this.Gateway.parentAdapter.log.error(this.device.Name + " wrong device id " + device.ID + "! must follow F-xxxxxxxx-yyyyyyyyyyyy-zz");
        }
        if (typeof device.Name == undefined || device.Name.length < 2) {
            this.Gateway.parentAdapter.log.error(this.device.Name + " wrong device name");
        }
        if (typeof device.SerialNr == undefined || device.SerialNr.length < 2) {
            this.Gateway.parentAdapter.log.error(this.device.Name + " wrong device SerialNr");
        }
        if (typeof device.MaxPower == undefined)
        {
            this.Gateway.parentAdapter.log.error(this.device.Name + " max. Power not set!  " );
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
                //MaxPowerConsumption: device.MaxPower,
                //MinPowerConsumption: device.MinPower
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


        //todo
        if (device.Type == "EVCharger") {
            //see SEMP-41YE3814-AN-EVCharger-1.0.3.pdf
            //add additional infos
            this.deviceInfo.Characteristics.MaxPowerConsumption = device.MaxPower; //
            if (device.MinPower > 0) {
                this.deviceInfo.Characteristics.MinPowerConsumption = device.MinPower; //needed to control level
            }
            this.deviceInfo.Characteristics.MinOnTime = 900;
            this.deviceInfo.Characteristics.MinOffTime = 900;

            /*
            this.deviceInfo.Characteristics.AddEnergySwitchOn           //in Wh
            this.deviceInfo.Characteristics.AddCostsSwitchOn            //in €
            this.deviceInfo.Characteristics.PowerLevels
            */


        }

        this.deviceStatus = {
            DeviceId: device.ID,
            EMSignalsAccepted: true,
            Status: "Off",
        };

        this.subscribe();

        this.createObjects();

        this.Gateway.parentAdapter.log.debug("device created " + this.device.ID + " " + this.device.Name);

        this.getCurrentStates();

        this.StatusDetectionOnTimerID = null;
        this.StatusDetectionOffTimerID = null;
        this.InMinRunTime = false;

        this.CancelRequestTimerID = null;

        this.SetState("waiting");

    }


    destructor() {
        this.Gateway.parentAdapter.log.debug("destructor called ");

        if (this.CancelRequestTimerID) {
            clearTimeout(this.CancelRequestTimerID);
            this.CancelRequestTimerID = null;
        }
    }


    Check2Switch() {

        if (this.planningrequest != null) {
            let switchOff = this.planningrequest.Check2Switch();

            if (switchOff) {
                this.SwitchOff();
            }
        }
    }

    async SwitchOff() {

        this.Gateway.parentAdapter.log.debug(this.device.Name + " turn device off");

        await this.Switch(false);
    }

    setLastPower(watts, minPower, maxPower) {

        if (this.device.MeasurementUnit == "kW") {
            watts = watts * 1000;
        }

        this.Gateway.parentAdapter.log.debug(this.device.Name + " setLastPower " + watts + " " + typeof watts + " " + this.device.StatusDetection + " " + this.device.MeasurementUnit);

        this.CalcEnergy(watts);
        if (this.planningrequest != null) {
            this.planningrequest.SetCurrentEnergy(Math.round(this.EnergyData.SumEnergy));
        }

       

        let key = "Devices." + this.device.Name + ".Energy";
        this.Gateway.parentAdapter.setState(key, { ack: true, val: Math.round(this.EnergyData.SumEnergy) });


        if (this.device.StatusDetection == "FromPowerValue") {

            //limit festlegen, 1 Watt könnte standby sein
            let limit = 0;
            if (typeof this.device.StatusDetectionLimit != undefined && this.device.StatusDetectionLimit != null && Number(this.device.StatusDetectionLimit) > 0) {
                limit = Number(this.device.StatusDetectionLimit);
                this.Gateway.parentAdapter.log.debug(this.device.Name + " set status detection limit to " + limit);
            }

            if (watts > limit) {
                if (typeof this.device.StatusDetectionLimitTimeOn != undefined && this.device.StatusDetectionLimitTimeOn != null && Number(this.device.StatusDetectionLimitTimeOn) > 0) {

                    this.Gateway.parentAdapter.log.debug(this.device.Name + " status detection time limit is " + this.device.StatusDetectionLimitTimeOn + " going to on");
                    //going to on
                    if (this.deviceStatus.Status == "On" || this.StatusDetectionOnTimerID != null) {
                        //nothing to do, already true or timer started
                    }
                    else {
                        this.StatusDetectionOnTimerID = setTimeout(this.SetStatusOn.bind(this), this.device.StatusDetectionLimitTimeOn * 60 * 1000);
                        this.Gateway.parentAdapter.log.debug(this.device.Name + " start setStatusOn - timer");
                    }
                    if (this.StatusDetectionOffTimerID) {
                        this.Gateway.parentAdapter.log.debug(this.device.Name + " cancel setStatusOff - timer");
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

                        this.Gateway.parentAdapter.log.debug(this.device.Name + " status detection time limit is " + this.device.StatusDetectionLimitTimeOff + " going to off");
                        //going to off
                        if (this.deviceStatus.Status == "Off" || this.StatusDetectionOffTimerID != null) {
                            //nothing to do, already false or timer started
                        }
                        else {
                            this.StatusDetectionOffTimerID = setTimeout(this.SetStatusOff.bind(this), this.device.StatusDetectionLimitTimeOff * 60 * 1000);
                            this.Gateway.parentAdapter.log.debug(this.device.Name + " start setStatusOff - timer");
                        }
                        if (this.StatusDetectionOnTimerID) {
                            this.Gateway.parentAdapter.log.debug(this.device.Name + " cancel setStatusOn - timer");
                            clearTimeout(this.StatusDetectionOnTimerID);
                            this.StatusDetectionOnTimerID = null;
                        }
                    }
                    else {
                        this.setOnOff("Off");
                    }
                }
                else {
                    this.Gateway.parentAdapter.log.debug(this.device.Name + " still in min run time... not to switch off");
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
        this.Gateway.parentAdapter.log.debug(this.device.Name + " setState " + state);
        this.deviceStatus.Status = state;

        if (this.planningrequest != null) {
            this.planningrequest.SetDeviceStatus(state);
        }
        if (state == "On") {

            this.SetState("On");

            //cancel timer if running
            if (this.CancelRequestTimerID) {
                clearTimeout(this.CancelRequestTimerID);
                this.CancelRequestTimerID = null;
            }
        }
        else {
            this.SetState("waiting");
        }
    }

    /*
    2022-11-19 18:00:03.046	warn	State "semp.0.javascript.0.semp.Wallbox.ChargePower" has no existing object, this might lead to an error in future versions
    2022-11-19 18:00:03.043	debug	F-53088660-000000000003-00 new recommendation power undefined
    2022-11-19 18:00:03.036	warn	State "semp.0.javascript.0.semp.Wallbox.StopCharge" has no existing object, this might lead to an error in future versions
    2022-11-19 18:00:02.987	debug	F-53088660-000000000003-00 setState Off
    2022-11-19 18:00:02.986	debug	F-53088660-000000000003-00 set status detection limit to 100
    2022-11-19 18:00:02.985	debug	F-53088660-000000000003-00 setLastPower 0 number FromPowerValue W
    2022-11-19 18:00:02.975	warn	State "semp.0.javascript.0.semp.Wallbox.StartCharge" has no existing object, this might lead to an error in future versions
    2022-11-19 18:00:02.961	debug	javascript.0.semp.Device3_OnOff set state false
    2022-11-19 18:00:02.960	debug	F-53088660-000000000003-00 got state {"val":true,"ack":false,"ts":1668874743142,"q":0,"from":"system.adapter.semp.0","user":"system.user.admin","lc":1668874743142} target is false
    2022-11-19 18:00:02.958	debug	F-53088660-000000000003-00 set new recommendation state to false
    2022-11-19 18:00:02.936	debug	F-53088660-000000000003-00 new recommendation false
    2022-11-19 18:00:02.936	debug	F-53088660-000000000003-00 received recommendation {"DeviceControl":{"DeviceId":"F-53088660-000000000003-00","On":false,"Timestamp":0}} {"DeviceControl":{"DeviceId":"F-53088660-000000000003-00","On":true,"Timestamp":0,"RecommendedPowerConsumption":11000}}


*/




    async sendEMRecommendation(em2dev) {

        this.Gateway.parentAdapter.log.debug(this.device.Name + " received recommendation " + JSON.stringify(em2dev) + " " + JSON.stringify(this.lastRecommendation));

        if (this.lastRecommendation == null || this.lastRecommendation.DeviceControl.On != em2dev.DeviceControl.On) {
            await this.setRecommendationState(em2dev.DeviceControl.On);
        }

        await this.setRecommendation(em2dev.DeviceControl.On);

        if (this.device.Type == "EVCharger") {
            await this.setRecommendationPowerConsumption(em2dev.DeviceControl.RecommendedPowerConsumption);
        }

        this.StartCancelRequest(em2dev.DeviceControl.On);

        this.lastRecommendation = em2dev;
    }

    StartCancelRequest(value) {
        //TimerCancelIfNotOn
        //TimerCancelIfNotOnTime

        if (value) {
            this.SetState("waiting for On");
            if (this.device.TimerCancelIfNotOn != null && this.device.TimerCancelIfNotOn) {

                if (this.device.TimerCancelIfNotOnTime != null && Number(this.device.TimerCancelIfNotOnTime) > 0) {

                    if (this.CancelRequestTimerID) {
                        this.Gateway.parentAdapter.log.debug(this.device.Name + " StartCancelRequest, nothing to do, already running")
                    }
                    else {
                        this.Gateway.parentAdapter.log.debug(this.device.Name + " StartCancelRequest")
                        this.CancelRequestTimerID = setTimeout(this.CancelRequest.bind(this), Number(this.device.TimerCancelIfNotOnTime) * 60 * 1000);
                    }
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

        this.Gateway.parentAdapter.log.debug(this.device.Name + " cancel energy request because device is not switched on");

        if (this.planningrequest != null) {
            this.planningrequest.CancelActiveTimeframe();
        }
        //switch device off
        this.SwitchOff();

        if (this.CancelRequestTimerID) {
            clearTimeout(this.CancelRequestTimerID);
            this.CancelRequestTimerID = null;
        }
    }

    async setRecommendationState(value) {

        this.Gateway.parentAdapter.log.debug(this.device.Name + " new recommendation " + value);

        let key = "Devices." + this.device.Name + ".RecommendedState";
        await this.Gateway.parentAdapter.setStateAsync(key, { ack: true, val: value });
        key = "Devices." + this.device.Name + ".Changed";
        let now = new Date();
        await this.Gateway.parentAdapter.setStateAsync(key, { ack: true, val: now.toLocaleTimeString("de-DE") });
    }

    async setRecommendationPowerConsumption(value) {

        /*
        newDevice2 set new charge power undefined
        newDevice2 set new state waiting
        newDevice2 new recommendation power undefined
        */

        if (typeof value == undefined) {
            value = 0;
        }

        this.Gateway.parentAdapter.log.debug(this.device.Name + " new recommendation power " + value);

        await this.SetWallboxPower(value);

        let key = "Devices." + this.device.Name + ".RecommendedPower";
        await this.Gateway.parentAdapter.setStateAsync(key, { ack: true, val: value });
    }

    


    async setRecommendation(value) {

        if (this.device.HasOIDSwitch) {

            this.Gateway.parentAdapter.log.debug(this.device.Name + " set new recommendation state to " + value);

            await this.Switch(value);
        }
        if (this.device.Type == "EVCharger") {
            if (value) {
                await this.StartWallbox();
            }
            else {
                await this.StopWallbox();
            }
        }
    }

    async Switch(value) {

        //get current state, if different set it
        let curVal = await this.Gateway.parentAdapter.getForeignStateAsync(this.device.OID_Switch);

        this.Gateway.parentAdapter.log.debug(this.device.Name + " got state " + JSON.stringify(curVal) + " target is " + value);

        if (curVal != null && curVal.val != value) {

            this.Gateway.parentAdapter.log.debug(this.device.OID_Switch + " set state " + value);
            await this.Gateway.parentAdapter.setForeignStateAsync(this.device.OID_Switch, value);
        }
    }

    async getCurrentStates() {

        try {
            /*
            //holen von TimeOn vom state, damit wert nach reboot nicht verloren geht...
            let key = "Devices." + this.device.Name + ".TimeOn";
            let curVal = await this.Gateway.parentAdapter.getStateAsync(key);

            if (curVal != null) {
                let vals = curVal.val.split(":");
                if (vals.length > 1) {

                    //todo

                }
            }
*/

            //holen von State und setzen, damit OnTime richtig berechnet wird
            let key = "Devices." + this.device.Name + ".RecommendedState";
            let curVal = await this.Gateway.parentAdapter.getStateAsync(key);
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
                name: "recommended state from SHM",
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
                name: "last time recommendation changed",
                type: "string",
                role: "value.time",
                read: true,
                write: false
            }
        };
        await this.CreateObject(key, obj);

        key = "Devices." + this.device.Name + ".State";
        obj = {
            type: "state",
            common: {
                name: "current State",
                type: "string",
                role: "state",
                read: true,
                write: false
            }
        };
        await this.CreateObject(key, obj);

        key = "Devices." + this.device.Name + ".Energy";
        obj = {
            type: "state",
            common: {
                name: "Energy used",
                type: "number",
                unit: "Wh",
                role: "value",
                read: true,
                write: false
            }
        };
        await this.CreateObject(key, obj);


        if (this.device.Type == "EVCharger") {

            key = "Devices." + this.device.Name + ".MinEnergy";
            obj = {
                type: "state",
                common: {
                    name: "minimum energy for charging",
                    type: "number",
                    unit: "Wh",
                    role: "value",
                    read: true,
                    write: true
                }
            };
            await this.CreateObject(key, obj);
            await this.SetDefault(key, 0.1 * this.device.BatteryCapacity);

            key = "Devices." + this.device.Name + ".MaxEnergy";
            obj = {
                type: "state",
                common: {
                    name: "maximum energy for charging",
                    type: "number",
                    unit: "Wh",
                    role: "value",
                    read: true,
                    write: true
                }
            };
            await this.CreateObject(key, obj);
            await this.SetDefault(key, this.device.BatteryCapacity);

            key = "Devices." + this.device.Name + ".RecommendedPower";
            obj = {
                type: "state",
                common: {
                    name: "recommended power from SHM",
                    type: "number",
                    unit: "W",
                    role: "value",
                    read: true,
                    write: false
                }
            };
            await this.CreateObject(key, obj);

        }

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

    async SetDefault(key, value) {

        let current = await this.Gateway.parentAdapter.getStateAsync(key);

        if (current == null || current.val == 0) {
            await this.Gateway.parentAdapter.setStateAsync(key, value);
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

        await this.SubscribeWallbox();
    }


    GetOptionalEnergy() {

        let bRet = false;

        if (this.device.Type == "EVCharger") {
            bRet = true;
        }
        else {
            if (this.device.HasOIDSwitch) {
                bRet = true;
            }

            if (this.device.StatusDetection == "AlwaysOn") {
                bRet = false;
            }
        }
        this.Gateway.parentAdapter.log.debug("can use optional energy: " + bRet);

        return bRet;
    }

    async SetState(state) {
        let key = "Devices." + this.device.Name + ".State";
        await this.Gateway.parentAdapter.setStateAsync(key, { ack: true, val: state });
        this.Gateway.parentAdapter.log.debug(this.device.Name + " set new state " + state);
    }

    //=====================================================================================
    //wallbox

    async SubscribeWallbox() {
        if (this.device.Type == "EVCharger") {
            if (this.device.OID_PlugConnected != null && this.device.OID_PlugConnected.length > 5) {
                this.Gateway.parentAdapter.log.debug("subscribe OID_PlugConnected " + this.device.OID_PlugConnected);
                this.Gateway.parentAdapter.subscribeForeignStates(this.device.OID_PlugConnected);

                //and get last state
                let current = await this.Gateway.parentAdapter.getForeignStateAsync(this.device.OID_PlugConnected);
                if (current != null && current.val != null) {

                    this.setWallboxPlugConnected(current.val);
                }
            }
            if (this.device.OID_IsCharging != null && this.device.OID_IsCharging.length > 5) {
                this.Gateway.parentAdapter.log.debug("subscribe OID_IsCharging " + this.device.OID_IsCharging);
                this.Gateway.parentAdapter.subscribeForeignStates(this.device.OID_IsCharging);

                //and get last state
                let current = await this.Gateway.parentAdapter.getForeignStateAsync(this.device.OID_IsCharging);
                if (current != null && current.val != null) {

                    this.setWallboxIsCharging(current.val);
                }
            }
            if (this.device.OID_IsError != null && this.device.OID_IsError.length > 5) {
                this.Gateway.parentAdapter.log.debug("subscribe OID_IsError " + this.device.OID_IsError);
                this.Gateway.parentAdapter.subscribeForeignStates(this.device.OID_IsError);

                //and get last state
                let current = await this.Gateway.parentAdapter.getForeignStateAsync(this.device.OID_IsError);
                if (current != null && current.val != null) {

                    this.setWallboxIsError(current.val);
                }
            }

            let key = "Devices." + this.device.Name + ".MinEnergy";
            this.Gateway.parentAdapter.log.debug("subscribe  " + key);
            this.Gateway.parentAdapter.subscribeStates(key);

            
            key = "Devices." + this.device.Name + ".MaxEnergy";
            this.Gateway.parentAdapter.log.debug("subscribe  " + key);
            this.Gateway.parentAdapter.subscribeStates(key);

            //and get last state
            await this.GetEnergy4Wallbox();
        }
    }

    async GetEnergy4Wallbox() {
        let key = "Devices." + this.device.Name + ".MinEnergy";
        let current = await this.Gateway.parentAdapter.getStateAsync(key);
        let minEnergy = 0;
        if (current != null && current.val != null) {
            minEnergy = current.val;
        }

        key = "Devices." + this.device.Name + ".MaxEnergy";
        current = await this.Gateway.parentAdapter.getStateAsync(key);
        let maxEnergy = 0;
        if (current != null && current.val != null) {
            maxEnergy = current.val;
        }

        if (minEnergy > 0) {
            if (this.planningrequest != null) {
                this.planningrequest.SetMinEnergy(minEnergy);
            }
        }
        if (maxEnergy > 0) {
            if (this.planningrequest != null) {
                this.planningrequest.SetMaxEnergy(maxEnergy);
            }
        }

    }


    async StartWallbox() {

        if (this.device.OID_StartCharge != null
            && this.device.OID_StartCharge.length > 5
            && this.device.OID_StopCharge != null
            && this.device.OID_StopCharge.length > 5
            && this.device.OID_StartCharge == this.device.OID_StopCharge) {
            this.Gateway.parentAdapter.log.error(this.device.Name + " wallbox wrong datapoint configuration. StartCharge and StopCharge must be different but both are " + this.device.OID_StartCharge);
        }

        if (this.device.OID_StartCharge != null && this.device.OID_StartCharge.length > 5) {
            let key = this.device.OID_StartCharge;
            await this.Gateway.parentAdapter.setForeignStateAsync(key, { ack: true, val: true });   
        }
        if (this.device.OID_StopCharge != null && this.device.OID_StopCharge.length > 5) {
            let key = this.device.OID_StopCharge;
            await this.Gateway.parentAdapter.setForeignStateAsync(key, { ack: true, val: false });
        }
        await this.SetState("StartCharge");
    }

    async SetWallboxPower(value) {
        if (this.device.OID_ChargePower != null && this.device.OID_ChargePower.length > 5) {
            let key = this.device.OID_ChargePower;
            await this.Gateway.parentAdapter.setForeignStateAsync(key, { ack: true, val: value });
        }
        this.Gateway.parentAdapter.log.debug(this.device.Name + " set new charge power " + value);
    }

    async StopWallbox() {
        if (this.device.OID_StartCharge != null && this.device.OID_StartCharge.length > 5) {
            let key = this.device.OID_StartCharge;
            await this.Gateway.parentAdapter.setForeignStateAsync(key, { ack: true, val: false });
        }
        if (this.device.OID_StopCharge != null && this.device.OID_StopCharge.length > 5) {
            let key = this.device.OID_StopCharge;
            await this.Gateway.parentAdapter.setForeignStateAsync(key, { ack: true, val: true });
        }
        this.SetWallboxPower(0);
        this.SetState("StopCharge");
    }

    //wallbox interface 2 gateway
    async setWallboxPlugConnected(state) {
        //set timeframe and request

        this.Gateway.parentAdapter.log.debug(this.device.Name + " wallbox plug connected " + state);

        if (this.planningrequest != null) {
            this.planningrequest.SetPlugConnected(state);
        }
        if (state) {
            this.SetState("Plug Connected");
            this.EnergyData.lastTimestamp = -99;
            this.EnergyData.SumEnergy = 0;

            await this.GetEnergy4Wallbox();
        }
        else {
            this.SetState("Plug not Connected");
        }
    }

    setWallboxIsCharging(state) {
        this.Gateway.parentAdapter.log.debug(this.device.Name + " wallbox charging " + state);

        if (state) {
            this.SetState("charging");
        }
    }

    setMinEnergy(state) {
        this.Gateway.parentAdapter.log.debug(this.device.Name + " wallbox got new min energy " + state);

        if (state > 0) {
            if (this.planningrequest != null) {
                this.planningrequest.SetMinEnergy(state);
            }
        }
    }

    setMaxEnergy(state) {
        this.Gateway.parentAdapter.log.debug(this.device.Name + " wallbox got new max energy " + state);

        if (state > 0) {
            if (this.planningrequest != null) {
                this.planningrequest.SetMaxEnergy(state);
            }
        }
    }


    setWallboxIsError( state) {
        this.Gateway.parentAdapter.log.debug(this.device.Name + " wallbox error " + state);
    }

    CalcEnergy(watts) {
        let currentTimestamp = Date.now();
        if (this.EnergyData.lastTimestamp>0){
            
            let timeDiff = currentTimestamp - this.EnergyData.lastTimestamp;
            this.EnergyData.SumEnergy = this.EnergyData.SumEnergy + watts *  timeDiff/1000/60/60; //in Wh          
            this.Gateway.parentAdapter.log.debug(this.device.Name + " calc energy " + watts + " " + this.EnergyData.lastTimestamp + " = " + this.EnergyData.SumEnergy + "Wh");

            if (this.logger != null) {
                let records = [];
                //hier records bauen
                const record =
                {
                    Time: new Date().toLocaleString("de-DE"),
                    DeviceId: this.device.ID,
                    DeviceName: this.device.Name,
                    Power: watts,
                    LastTimeStamp: this.EnergyData.lastTimestamp,
                    Timediff: timeDiff,
                    Energy: this.EnergyData.SumEnergy

                };
                records.push(record);

                //und jetzt alle schreiben
                this.logger.WriteCSVLog(0, records);
            }
        }
        
        this.EnergyData.lastTimestamp = currentTimestamp;


        


    }

}







module.exports = {
    Device
};