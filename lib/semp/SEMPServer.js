/**
 * @fileOverview http server handling SEMP requests
 * @author Paul Orlob
 */

const express = require('express');

const js2xml = require("xml-js").json2xml;
const xml2js = require("xml-js").xml2js;



class SEMPServer {



    /**
     * Creates a new SEMP Server instance
     * @param uuid - Globally unique uuid
     * @param ipAddress - ip address of the server
     * @param port - port to run the server on
     * @param descriptionXml Description XML string
     * @param gateway Gateway
     */
    constructor(uuid,
        ipAddress,
        port,
        descriptionXml,
        gateway,
        extendedLog,
        logger

        ) {

        this.uuid = uuid;
        this.ipAddress = ipAddress;
        this.port = port;
        this.descriptionXml = descriptionXml;
        this.Gateway = gateway;

        this.app = express();
        this.initRoutes()
        this.server = null;
        this.extendedLog = extendedLog;

        this.logger = logger;

        this.Gateway.parentAdapter.log.debug("SEMPServer created");

        this.DiscoveryheckTimerID = null;
        this.DiscoveryheckTimerID = setTimeout(this.InfoNotDiscovered.bind(this), 3 * 60 * 1000);

    }


    InfoNotDiscovered() {
        this.Gateway.parentAdapter.log.error("adapter / gateway not yet discovered by SHM! check adapter and network settings!");
    }

    /**
     * Initializes SEMP routes
     */
    initRoutes() {
        
        this.app.get('/description.xml', (req, res) => {
            this.Gateway.parentAdapter.log.debug("SHM requested description");

            if (this.DiscoveryheckTimerID != null) {

                this.Gateway.parentAdapter.log.info("adapter discovered by SHM");

                clearTimeout(this.DiscoveryheckTimerID);
                this.DiscoveryheckTimerID = null;
            }


            res.set('Content-Type', 'text/xml');
            res.send(this.descriptionXml)
            if (this.extendedLog) {
                this.Gateway.parentAdapter.log.debug("description xml sent " + this.descriptionXml);
            }
        });
        
        // All devices
        this.app.get('/semp/', (req, res) => {
            this.Gateway.parentAdapter.log.debug("SHM requested all devices. " + req.originalUrl  + " " + req.ip + " " + req.protocol);
            let deviceList = this.Gateway.getAllDevices();
            //this.Gateway.parentAdapter.log.debug("got device list");
            let devices = this.convertDevices(deviceList);
            //this.Gateway.parentAdapter.log.debug("response " );
            res.send(this.convertJSToXML(devices));
            this.Gateway.parentAdapter.log.debug("response sent");
        });

        this.app.post('/semp/', (req, res) => {
            this.Gateway.parentAdapter.log.debug("received post from SHM " + req.ip);
            let body = "";
            req.on("data", (chunk => {
                body += chunk
            }));
            req.on("end", () => {
                let json = xml2js(body, { compact: true, ignoreDeclaration: true, ignoreDoctype: true, nativeType: true });
                this.Gateway.onSEMPMessage(this.convertEM2Device(json));
                res.end()
            });
        });

        //===================================================================================
        //just for testing
        this.app.get('/getdummydevice/', (req, res) => {
            this.Gateway.parentAdapter.log.debug("Requested dummy devices. " + req.originalUrl + " " + req.ip + " " + req.protocol);

            let power = Math.random() * 10;

            let dummydevice = {
                Name: "dummy",
                CurrentPower: power,
                Status: "On"
            };

            //res.send(this.convertJSToXML(dummydevice));
            res.send(dummydevice);
            this.Gateway.parentAdapter.log.debug("response sent");
        });

        this.app.post('/setdummydevice/', (req, res) => {
            this.Gateway.parentAdapter.log.debug("received set dummy device " + rewq.ip);
            let body = "";
            req.on("data", (chunk => {
                body += chunk
            }));
            req.on("end", () => {

                this.Gateway.parentAdapter.log.debug("got body " + body);

                res.end()
            });
        });



        this.app.all('*', (req, res) => {
            this.Gateway.parentAdapter.log.error("Unmatched url... " + req.url + " " + JSON.stringify(req.query));
            res.end()
        });
    }

    convertJSToXML(js) {
        
        let rawJs = {
            _declaration: {
                _attributes: {
                    version: "1.0",
                    encoding: "utf-8"
                }
            },
            Device2EM: js
        };
        
        let ret = js2xml(rawJs, { compact: true, spaces: 4 } )

        //if (this.extendedLog) {
            this.Gateway.parentAdapter.log.debug("response xml " + ret);
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
        em2dev = em2dev.EM2Device;

        this.Gateway.parentAdapter.log.debug("convertEM2Device got " + JSON.stringify(em2dev));

        /*
         "RecommendationPower": "{\"DeviceId\":{\"_text\":\"F-53088660-000000000003-00\"},\"On\":{\"_text\":true},\"RecommendedPowerConsumption\":{\"_text\":11040},\"Timestamp\":{\"_text\":0}}" }]
         */

        if (this.logger != null) {
            let records = [];
            //hier records bauen
            const record =
            {
                Time: new Date().toLocaleString("de-DE"),
                DeviceId: em2dev.DeviceControl.DeviceId._text,
                RecommendationStatus: em2dev.DeviceControl.On._text,
                RecommendationPower: JSON.stringify(em2dev.DeviceControl)
            };
            records.push(record);

            //und jetzt alle schreiben
            this.logger.WriteCSVLog(0, records);
        }

        let oRet = {
            DeviceControl: {
                DeviceId: em2dev.DeviceControl.DeviceId._text,
                On: em2dev.DeviceControl.On._text,
                //RecommendedPowerConsumption: em2dev.DeviceControl.RecommendedPowerConsumption._text,
                Timestamp: em2dev.DeviceControl.Timestamp._text
            }
        }

        if (em2dev.DeviceControl.RecommendedPowerConsumption != null && em2dev.DeviceControl.RecommendedPowerConsumption._text != null) {

            //2023-02-15
            //we got
            //semp message {"DeviceControl":{"DeviceId":"F-12345678-000000000009-00","On":true,"Timestamp":0,"RecommendedPowerConsumption":2456.39990234375}}
            // -> round() added
            oRet.DeviceControl.RecommendedPowerConsumption = Math.round(Number(em2dev.DeviceControl.RecommendedPowerConsumption._text));
        }


        return oRet;
        
    }

    


    convertDevices(devices) {

        //this.Gateway.parentAdapter.log.debug("convert device ");

        let devInfos = [];
        let devStatuses = [];
        let devPlanningRequests = [];
        let records = [];

        for (let d of devices) {

            //this.Gateway.parentAdapter.log.debug("convert device " + JSON.stringify(d));

            devInfos.push(d.deviceInfo);
            devStatuses.push(d.deviceStatus);

            
            if (d.planningRequest.Timeframe.length != 0) {
                devPlanningRequests.push(d.planningRequest)
            }

            if (d.planningRequest.Timeframe.length > 0) {
                for (let t = 0; t < d.planningRequest.Timeframe.length; t++) {
                    //hier records bauen

                    let timeframeactive = d.planningRequest.Timeframe[t].EarliestStart == 0 && d.planningRequest.Timeframe[t].LatestEnd > 0;

                    if (this.logger != null) {
                        const record =
                        {
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
                    const record =
                    {
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
        }

    }

    /**
     * Start the server.
     * @returns promise that resolves when server has started.
     */
    start() {
        if (!this.port) {
            this.Gateway.parentAdapter.log.error("SempServer: Port must be specified!");
            throw "Port must be specified!";
        }
        if (this.port < 0) {
            this.Gateway.parentAdapter.log.error("SempServer: Port has to be greater than 0! " + this.port);
            throw "Port has to be greater than 0!";
        }

        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, () => {
                this.Gateway.parentAdapter.log.debug("SEMP server listening on " + this.port);
                resolve()
            })
        });

        this.Gateway.parentAdapter.log.debug("SEMP server started");
    }




    



    /**
     * Stops the server.
     * @returns promise that resolves when the server is stopped.
     */
    stop() {
        this.Gateway.parentAdapter.log.debug("SEMP server stopped");
        return new Promise((resolve, reject) => {
            if (this.server != null) {
                this.server.close(() => {
                    resolve()
                })
            } else {
                reject()
            }
        })
    }

}

module.exports = {
    SEMPServer
};


