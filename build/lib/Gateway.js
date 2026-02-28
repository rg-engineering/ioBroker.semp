"use strict";
/* eslint-disable prefer-template */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const csvLogger_1 = __importDefault(require("./csvLogger"));
const SSDPServer_1 = __importDefault(require("./SSDPServer"));
const SEMPServer_1 = __importDefault(require("./SEMPServer"));
const DescriptionGenerator_1 = __importDefault(require("./DescriptionGenerator"));
const Device_1 = __importDefault(require("./Device"));
const base_1 = __importDefault(require("./base"));
class Gateway extends base_1.default {
    csvLogger = null;
    ssdpServer = null;
    sempServer = null;
    devices;
    constructor(parentAdapter, uuid, ipAddress, sempPort, friendlyName, manufacturer) {
        super(parentAdapter, 0, "Gateway");
        this.csvLogger = null;
        this.ssdpServer = new SSDPServer_1.default("http://" + ipAddress + ":" + sempPort + "/description.xml", uuid, this);
        const descriptionXml = DescriptionGenerator_1.default.generateDescription(uuid, "http://" + ipAddress + ":" + sempPort, friendlyName, manufacturer, "/semp");
        this.sempServer = new SEMPServer_1.default(uuid, ipAddress, sempPort, descriptionXml, this, parentAdapter.config.extendedLog, this.csvLogger);
        this.devices = new Map();
        this.logDebug("gateway created...");
    }
    async start() {
        if (this.sempServer == null || this.ssdpServer == null) {
            this.logError("cannot start gateway, servers are undefined");
            return;
        }
        try {
            await this.sempServer.start();
            this.ssdpServer.start();
            this.logDebug("gateway started...");
        }
        catch (e) {
            this.logError("exception in start [" + e + "]");
        }
        if (this.adapter !== null && this.adapter.config.LogToCSV) {
            this.csvLogger = new csvLogger_1.default(this.adapter);
            const header = [
                { id: "Time", title: "Time" }, //Column1
                { id: "DeviceId", title: "DeviceId" }, //Column2
                { id: "DeviceName", title: "DeviceName" }, //Column3
                { id: "Status", title: "Status" }, //Column4
                { id: "AveragePower", title: "AveragePower" }, //Column5
                { id: "TimeFrameID", title: "TimeFrameID" }, //Column6
                { id: "EarliestStart", title: "EarliestStart" }, //Column7
                { id: "LatestEnd", title: "LatestEnd" }, //Column8
                { id: "MinRunningTime", title: "MinRunningTime" }, //Column9
                { id: "MaxRunningTime", title: "MaxRunningTime" }, //Column10
                { id: "MinEnergy", title: "MinEnergy" }, //Column11
                { id: "MaxEnergy", title: "MaxEnergy" }, //Column12
                { id: "RecommendationStatus", title: "RecommendationStatus" }, //Column13
                { id: "RecommendationPower", title: "RecommendationPower" }, //Column14
                { id: "Power", title: "Power" }, //Column15
                //{ id: 'LastTimeStamp', title: 'LastTimeStamp' },                    //Column16
                { id: "Timediff", title: "Timediff" }, //Column17
                { id: "Energy", title: "Energy" } //Column18
            ];
            this.csvLogger.StartLog(this.adapter.config.LogToCSVPath, header);
            //just add headlines
            const records = [];
            const record = {
                Time: "Time",
                DeviceId: "DeviceId",
                DeviceName: "DeviceName",
                Status: "Status",
                AveragePower: "AveragePower",
                TimeFrameID: "TimeFrameID",
                EarliestStart: "EarliestStart",
                LatestEnd: "LatestEnd",
                MinRunningTime: "MinRunningTime",
                MaxRunningTime: "MaxRunningTime",
                MinEnergy: "MinEnergy",
                MaxEnergy: "MaxEnergy",
                RecommendationStatus: "RecommendationStatus",
                RecommendationPower: "RecommendationPower",
                Power: "Power",
                //LastTimeStamp: 'LastTimeStamp',
                Timediff: "Timediff",
                Energy: "Energy",
            };
            records.push(record);
            //und jetzt alle schreiben
            await this.csvLogger.WriteCSVLog(0, records);
        }
    }
    async stop() {
        if (this.sempServer == null || this.ssdpServer == null) {
            this.logError("cannot stop gateway, servers  are undefined");
            return;
        }
        try {
            //kill device timer
            this.deleteAllDevices();
            await this.sempServer.stop();
            this.ssdpServer.stop();
            this.logDebug("gateway stopped...");
        }
        catch (e) {
            this.logError("exception in stop [" + e + "]");
        }
    }
    setPowerDevice(id, power) {
        const d = this.getDevice(id);
        if (d != null) {
            d.setLastPower(power, null, null);
        }
        else {
            this.logError("unknown device with id " + id);
        }
    }
    setOnOffDevice(id, state) {
        let newState = "";
        if (typeof state === "number") {
            if (state > 0) {
                newState = "On";
            }
            else {
                newState = "Off";
            }
        }
        else if (typeof state === "boolean") {
            if (state) {
                newState = "On";
            }
            else {
                newState = "Off";
            }
        }
        else if (typeof state === "string") {
            if (state.toLowerCase().includes("on")) {
                newState = "On";
            }
            else {
                newState = "Off";
            }
        }
        const d = this.getDevice(id);
        if (d != null) {
            d.setOnOff(newState);
        }
        else {
            this.logError("unknown device with id " + id);
        }
    }
    //====================================
    //wallbox
    setWallboxPlugConnected(id, state) {
        const d = this.getDevice(id);
        if (d != null) {
            d.setWallboxPlugConnected(state);
        }
        else {
            this.logError("unknown device with id " + id);
        }
    }
    setWallboxIsCharging(id, state) {
        const d = this.getDevice(id);
        if (d != null) {
            d.setWallboxIsCharging(state);
        }
        else {
            this.logError("unknown device with id " + id);
        }
    }
    setWallboxIsError(id, state) {
        const d = this.getDevice(id);
        if (d != null) {
            d.setWallboxIsError(state);
        }
        else {
            this.logError("unknown device with id " + id);
        }
    }
    setMinEnergy(id, state) {
        const d = this.getDevice(id);
        if (d != null) {
            this.logDebug("GW set minEnergy " + state);
            d.setMinEnergy(state);
        }
        else {
            this.logError("unknown device with id " + id);
        }
    }
    setMaxEnergy(id, state) {
        const d = this.getDevice(id);
        if (d != null) {
            this.logDebug("GW set maxEnergy " + state);
            d.setMaxEnergy(state);
        }
        else {
            this.logError("unknown device with id " + id);
        }
    }
    EnableFastCharging(id, state) {
        const d = this.getDevice(id);
        if (d != null) {
            this.logDebug("GW enable fast charging " + state);
            d.EnableFastCharging(state);
        }
        else {
            this.logError("unknown device with id " + id);
        }
    }
    SetMaxChargeTime(id, state) {
        const d = this.getDevice(id);
        if (d != null) {
            this.logDebug("GW set max charge time " + state);
            d.SetMaxChargeTime(state);
        }
        else {
            this.logError("unknown device with id " + id);
        }
    }
    //====================================
    async addDevice(device) {
        try {
            this.logDebug("add device " + device.ID);
            const d = new Device_1.default(this, device, this.csvLogger);
            await d.startup();
            this.setDevice(device.ID, d);
        }
        catch (e) {
            this.logError("exception in addDevice [" + e + "]");
        }
    }
    setDevice(id, device) {
        this.logDebug("set device ");
        this.devices.set(id, device);
    }
    getDevice(id) {
        //this.parentAdapter.log.debug("get device " + id);
        return this.devices.get(id);
    }
    getAllDevices() {
        const ds = [];
        try {
            this.logDebug("get all devices ");
            for (const d of this.devices.values()) {
                // `d` ist bereits die Device-Instanz
                const dev = d;
                // Check2Switch aufrufen (Device-Methode kann nicht typsicher bekannt sein)
                try {
                    // falls vorhanden aufrufen
                    if (typeof dev.Check2Switch === "function") {
                        dev.Check2Switch();
                    }
                }
                catch (err) {
                    this.logError("error in Check2Switch [" + err + "]");
                }
                let requests = [];
                if (dev.planningrequest != null) {
                    requests = dev.planningrequest.getPlanningrequestData();
                    for (let r = 0; r < requests.length; r++) {
                        // deviceInfo möglicherweise nicht typisiert => casten
                        requests[r].DeviceId = d.deviceInfo.Identification.DeviceId;
                    }
                }
                const planningRequest = {
                    Timeframe: requests
                };
                const device = {
                    deviceInfo: d.deviceInfo,
                    deviceStatus: d.deviceStatus,
                    planningRequest: planningRequest
                };
                ds.push(device);
            }
        }
        catch (e) {
            this.logError("exception in getAllDevices [" + e + "]");
        }
        return ds;
    }
    deleteDevice(id) {
        this.logDebug("delete device " + id);
        return this.devices.delete(id);
    }
    deleteAllDevices() {
        this.logDebug("delete all devices");
        this.devices.clear();
    }
    async onSEMPMessage(message) {
        this.logDebug("semp message " + JSON.stringify(message));
        const d = this.getDevice(message.DeviceControl.DeviceId);
        if (d) {
            await d.sendEMRecommendation(message);
        }
    }
}
exports.default = Gateway;
//# sourceMappingURL=Gateway.js.map