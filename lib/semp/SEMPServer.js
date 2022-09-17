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
        extendedLog) {

        this.uuid = uuid;
        this.ipAddress = ipAddress;
        this.port = port;
        this.descriptionXml = descriptionXml;
        this.Gateway = gateway;

        this.app = express();
        this.initRoutes()
        this.server = null;
        this.extendedLog = extendedLog;

        this.Gateway.parentAdapter.log.debug("SEMPServer created");
    }

    /**
     * Initializes SEMP routes
     */
    initRoutes() {
        
        this.app.get('/description.xml', (req, res) => {
            //this.Gateway.parentAdapter.log.debug("send description xml");

            res.set('Content-Type', 'text/xml');
            res.send(this.descriptionXml)
            if (this.extendedLog) {
                this.Gateway.parentAdapter.log.debug("description xml sent " + this.descriptionXml);
            }
        });
        
        // All devices
        this.app.get('/semp/', (req, res) => {
            this.Gateway.parentAdapter.log.debug("Requested all devices. " + req.originalUrl  + " " + req.ip + " " + req.protocol);
            let deviceList = this.Gateway.getAllDevices();
            //this.Gateway.parentAdapter.log.debug("got device list");
            let devices = this.convertDevices(deviceList);
            //this.Gateway.parentAdapter.log.debug("response " );
            res.send(this.convertJSToXML(devices));
            this.Gateway.parentAdapter.log.debug("response sent");
        });

        this.app.post('/semp/', (req, res) => {
            this.Gateway.parentAdapter.log.debug("received post " + req.ip);
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

        if (this.extendedLog) {
            this.Gateway.parentAdapter.log.debug("response xml " + ret);
        }
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

        return {
            DeviceControl: {
                DeviceId: em2dev.DeviceControl.DeviceId._text,
                On: em2dev.DeviceControl.On._text,
                //RecommendedPowerConsumption: em2dev.DeviceControl.RecommendedPowerConsumption._text,
                Timestamp: em2dev.DeviceControl.Timestamp._text
            }
        }
    }

    convertDevices(devices) {

        //this.Gateway.parentAdapter.log.debug("convert device");

        let devInfos = [];
        let devStatuses = [];
        let devPlanningRequests = [];

        for (let d of devices) {
            devInfos.push(d.deviceInfo);
            devStatuses.push(d.deviceStatus);
            if (d.planningRequest.Timeframe.length != 0) {
                devPlanningRequests.push(d.planningRequest)
            }
        }

        return {
            _attributes: {
                xmlns: "http://www.sma.de/communication/schema/SEMP/v1"
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


/*

Device2EM:
DeviceInfo:
Identification:
DeviceId:1234-12345678-12-12
DeviceName: yyyyyyyyyyy
DeviceVendor: xxxxxxxxx
Characteristics:
MaxPowerConsumption:1500
Capabilities:
CurrentPower/Method: Measurement
Timestamps/AbsoluteTimestamps: false
Interruptions/InterruptionsAllowed: true
DeviceStatus:
DeviceId: 1234-12345678-12-12
EMSignalsAccepted: true
Status: Off
PowerConsumption/PowerInfo:
AveragePower: 0 (Watt)
Timestamp: 0 (point of power measurement)
AveragingInterval: 60 (seconds)
PlanningRequest:
Timeframe:
TimeframeId: 1
DeviceId: 1234-12345678-12-12
EarliestStart: 18000 (earliest in 5h)
LatestEnd: 25200 (latest in 7h)
MinRunningTime: 3600 (MUST: 1h)
MaxRunningTime: 3600 (no optional operation)




<?xml version="1.0" encoding="utf-8"?> 
<Device2EM xmlns="http://www.sma.de/communication/schema/SEMP/v1"> 
	<DeviceInfo> 
		<Identification> 
			<DeviceId>F-53088660-100000000001-00</DeviceId> 
			<DeviceName>semp</DeviceName> 
			<DeviceType>Pump</DeviceType> 
			<DeviceSerial>12345678ABCD</DeviceSerial> 
			<DeviceVendor>Bosch</DeviceVendor> 
		</Identification> 
		<Characteristics> 
			<MaxPowerConsumption>1000</MaxPowerConsumption> 
		</Characteristics> 
		<Capabilities> 
			<CurrentPower> 
				<Method>Measurement</Method> 
			</CurrentPower> 
			<Timestamps> 
				<AbsoluteTimestamps>true</AbsoluteTimestamps> 
			</Timestamps> 
			<Interruptions> 
				<InterruptionsAllowed>false</InterruptionsAllowed> 
			</Interruptions> 
			<Requests> 
				<OptionalEnergy>false</OptionalEnergy> 
			</Requests> 
		</Capabilities> 
	</DeviceInfo> 
	<DeviceStatus> 
		<DeviceId>F-53088660-100000000001-00</DeviceId> 
		<EMSignalsAccepted>false</EMSignalsAccepted> 
		<Status>On</Status> 
		<PowerConsumption> 
			<PowerInfo> 
				<AveragePower>77</AveragePower> 
				<Timestamp>0</Timestamp> 
				<AveragingInterval>60</AveragingInterval> 
			</PowerInfo> 
		</PowerConsumption> 
	</DeviceStatus> 
	<PlanningRequest> 
		<Timeframe> 
			<TimeframeId>1</TimeframeId> 
			<DeviceId>F-53088660-100000000001-00</DeviceId> 
			<EarliestStart>7200</EarliestStart> 
			<LatestEnd>36000</LatestEnd> 
			<MinRunningTime>1200</MinRunningTime> 
			<MaxRunningTime>2400</MaxRunningTime> 
		</Timeframe> 
	</PlanningRequest> 
</Device2EM>

*/


/*
EM2Device:
DeviceControl:
DeviceId: 1234-12345678-12-12
On: true (Start recommendation)
Timestamp: 0 (Creation Timestamp)


*/