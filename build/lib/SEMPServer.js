"use strict";
/* eslint-disable prefer-template */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const xml_js_1 = require("xml-js");
const base_1 = __importDefault(require("./base"));
class SEMPServer extends base_1.default {
    uuid;
    ipAddress;
    port;
    descriptionXml;
    Gateway;
    app;
    server;
    extendedLog;
    DiscoveryheckTimerID;
    logger;
    /**
     * Creates a new SEMP Server instance
     */
    constructor(uuid, ipAddress, port, descriptionXml, gateway, extendedLog, logger) {
        super(gateway.adapter, 0, "SempServer");
        this.uuid = uuid;
        this.ipAddress = ipAddress;
        this.port = port;
        this.descriptionXml = descriptionXml;
        this.Gateway = gateway;
        this.app = (0, express_1.default)();
        this.initRoutes();
        this.server = null;
        this.extendedLog = extendedLog;
        this.logger = logger;
        this.logDebug("SEMPServer created");
        this.DiscoveryheckTimerID = null;
        this.DiscoveryheckTimerID = setTimeout(this.InfoNotDiscovered.bind(this), 3 * 60 * 1000);
        //this.testtimer = null;
    }
    InfoNotDiscovered() {
        this.logError("adapter / gateway not yet discovered by SHM! check adapter and network settings!");
    }
    isEM2DeviceInput(obj) {
        return obj?.EM2Device?.DeviceControl != null;
    }
    /**
     * Initializes SEMP routes
     */
    initRoutes() {
        //this.testtimer = setInterval(this.test.bind(this), 30 * 1000);
        this.app.get("/description.xml", (req, res) => {
            this.logDebug("SHM requested description");
            if (this.DiscoveryheckTimerID != null) {
                this.logInfo("adapter discovered by SHM");
                clearTimeout(this.DiscoveryheckTimerID);
                this.DiscoveryheckTimerID = null;
            }
            res.set("Content-Type", "text/xml");
            res.send(this.descriptionXml);
            if (this.extendedLog) {
                this.logDebug("description xml sent " + this.descriptionXml);
            }
        });
        // All devices
        this.app.get("/semp/", (req, res) => {
            this.logDebug("SHM requested all devices. " + req.originalUrl + " " + req.ip + " " + req.protocol);
            const deviceList = this.Gateway.getAllDevices();
            //this.Gateway.parentAdapter.log.debug("got device list");
            const devices = this.convertDevices(deviceList);
            //this.Gateway.parentAdapter.log.debug("response " );
            res.send(this.convertJSToXML(devices));
            this.logDebug("response sent");
        });
        this.app.post("/semp/", (req, res) => {
            this.logDebug("received post from SHM " + req.ip);
            let body = "";
            req.on("data", (chunk => {
                body += chunk;
            }));
            req.on("end", () => {
                const json = (0, xml_js_1.xml2js)(body, {
                    compact: true,
                    ignoreDeclaration: true,
                    ignoreDoctype: true,
                    nativeType: true
                });
                if (this.isEM2DeviceInput(json)) {
                    this.Gateway.onSEMPMessage(this.convertEM2Device(json));
                }
                res.end();
                res.end();
            });
        });
        //===================================================================================
        //just for testing
        /*
        this.app.get("/getdummydevice/", (req, res) => {
            this.Gateway.parentAdapter.log.debug("Requested dummy devices. " + req.originalUrl + " " + req.ip + " " + req.protocol);

            const power = Math.random() * 10;

            const dummydevice = {
                Name: "dummy",
                CurrentPower: power,
                Status: "On"
            };

            //res.send(this.convertJSToXML(dummydevice));
            res.send(dummydevice);
            this.Gateway.parentAdapter.log.debug("response sent");
        });

        this.app.post("/setdummydevice/", (req, res) => {
            this.Gateway.parentAdapter.log.debug("received set dummy device " + req.ip);
            let body = "";
            req.on("data", (chunk => {
                body += chunk;
            }));
            req.on("end", () => {

                this.Gateway.parentAdapter.log.debug("got body " + body);

                res.end();
            });
        });
        */
        this.app.all(/(.*)/, (req, res) => {
            this.logError("Unmatched url... " + req.url + " " + JSON.stringify(req.query));
            res.end();
        });
    }
    /*
    test() {

        this.Gateway.parentAdapter.log.debug("TEST!!! SHM requested all devices. " );
        const deviceList = this.Gateway.getAllDevices();
        //this.Gateway.parentAdapter.log.debug("got device list");
        const devices = this.convertDevices(deviceList);
        //this.Gateway.parentAdapter.log.debug("response " );
        this.Gateway.parentAdapter.log.debug("TEST!!! to send " +this.convertJSToXML(devices));

    }
    */
    convertJSToXML(js) {
        const rawJs = {
            _declaration: {
                _attributes: {
                    version: "1.0",
                    encoding: "utf-8"
                }
            },
            Device2EM: js
        };
        const ret = (0, xml_js_1.js2xml)(rawJs, { compact: true, spaces: 4 });
        //if (this.extendedLog) {
        this.logDebug("response xml " + ret);
        //}
        return ret;
    }
    /*
    <?xml
    <EM2Device
        xmlns="http://www.sma.de/communication/schema/SEMP/v1">
        <DeviceControl>
            <DeviceId>
                F-53088660-100000000001-00
                </DeviceId>
            <On>
                false
                </On>
            <Timestamp>
                0
                </Timestamp>
            </DeviceControl>
        </EM2Device>

*/
    convertEM2Device(em2dev) {
        const device = em2dev.EM2Device.DeviceControl;
        if (this.logger) {
            const record = {
                Time: new Date().toLocaleString("de-DE"),
                DeviceId: device.DeviceId._text,
                RecommendationStatus: device.On._text,
                RecommendationPower: JSON.stringify(device)
            };
            this.logger.WriteCSVLog(0, [record]);
        }
        const oRet = {
            DeviceControl: {
                DeviceId: device.DeviceId._text,
                On: device.On._text,
                Timestamp: device.Timestamp._text
            }
        };
        if (device.RecommendedPowerConsumption?._text != null) {
            oRet.DeviceControl.RecommendedPowerConsumption =
                Math.round(Number(device.RecommendedPowerConsumption._text));
        }
        return oRet;
    }
    convertDevices(devices) {
        //this.Gateway.parentAdapter.log.debug("convert device ");
        const devInfos = [];
        const devStatuses = [];
        const devPlanningRequests = [];
        const records = [];
        for (const d of devices) {
            //this.Gateway.parentAdapter.log.debug("convert device " + JSON.stringify(d));
            devInfos.push(d.deviceInfo);
            devStatuses.push(d.deviceStatus);
            if (d.planningRequest.Timeframe.length != 0) {
                devPlanningRequests.push(d.planningRequest);
            }
            if (d.planningRequest.Timeframe.length > 0) {
                for (let t = 0; t < d.planningRequest.Timeframe.length; t++) {
                    //hier records bauen
                    const timeframeactive = d.planningRequest.Timeframe[t].EarliestStart == 0 && d.planningRequest.Timeframe[t].LatestEnd > 0;
                    if (this.logger != null) {
                        const record = {
                            Time: new Date().toLocaleString("de-DE"),
                            DeviceId: d.deviceInfo.Identification.DeviceId,
                            DeviceName: d.deviceInfo.Identification.DeviceName,
                            Status: timeframeactive ? d.deviceStatus.Status : -1,
                            AveragePower: timeframeactive ? d.deviceStatus.PowerConsumption.PowerInfo[0].AveragePower : -1,
                            TimeFrameID: d.planningRequest.Timeframe[t].TimeframeId,
                            EarliestStart: d.planningRequest.Timeframe[t].EarliestStart,
                            LatestEnd: d.planningRequest.Timeframe[t].LatestEnd,
                            MinRunningTime: d.planningRequest.Timeframe[t].MinRunningTime != null ? d.planningRequest.Timeframe[t].MinRunningTime : -1,
                            MaxRunningTime: d.planningRequest.Timeframe[t].MaxRunningTime != null ? d.planningRequest.Timeframe[t].MaxRunningTime : -1,
                            MinEnergy: d.planningRequest.Timeframe[t].MinEnergy != null ? d.planningRequest.Timeframe[t].MinEnergy : -1,
                            MaxEnergy: d.planningRequest.Timeframe[t].MaxEnergy != null ? d.planningRequest.Timeframe[t].MaxEnergy : -1
                        };
                        // this.Gateway.parentAdapter.log.debug("111 " + JSON.stringify(d.deviceStatus.PowerConsumption));
                        records.push(record);
                    }
                }
            }
            else {
                if (this.logger != null) {
                    const record = {
                        Time: new Date().toLocaleString("de-DE"),
                        DeviceId: d.deviceInfo.Identification.DeviceId,
                        DeviceName: d.deviceInfo.Identification.DeviceName,
                        Status: d.deviceStatus.Status,
                        AveragePower: d.deviceStatus.PowerConsumption.PowerInfo[0].AveragePower,
                        TimeFrameID: -1,
                        EarliestStart: -1,
                        LatestEnd: -1,
                        MinRunningTime: -1,
                        MaxRunningTime: -1,
                        MinEnergy: -1,
                        MaxEnergy: -1
                    };
                    // this.Gateway.parentAdapter.log.debug("111 " + JSON.stringify(d.deviceStatus.PowerConsumption));
                    records.push(record);
                }
            }
        }
        if (this.logger != null) {
            //und jetzt alle schreiben
            this.logger.WriteCSVLog(0, records);
        }
        return {
            _attributes: {
                //laut evcc dies: 2023-02-12
                xmlns: "http://www.sma.de/communication/schema/SEMP/v1"
                //xmlns: "http://www.sma.de/DeviceCommunication/SEMP"
            },
            DeviceInfo: devInfos,
            DeviceStatus: devStatuses,
            PlanningRequest: devPlanningRequests
        };
    }
    async start() {
        if (!this.port) {
            this.logError("SempServer: Port must be specified!");
            //throw "Port must be specified!";
        }
        if (this.port < 0) {
            this.logError("SempServer: Port has to be greater than 0! " + this.port);
            //throw "Port has to be greater than 0!";
        }
        try {
            this.server = await new Promise((resolve, reject) => {
                const server = this.app.listen(this.port, () => {
                    this.logDebug("SEMP server listening on " + this.port);
                    resolve(server);
                });
                server.on("error", (err) => {
                    reject(err);
                });
            });
        }
        catch (error) {
            this.logError("SEMP server cannot start: " + error);
        }
    }
    async stop() {
        this.logDebug("SEMP server stopped");
        const server = this.server;
        if (!server) {
            return;
        }
        await new Promise((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
        });
        this.server = null;
    }
}
exports.default = SEMPServer;
//# sourceMappingURL=SEMPServer.js.map