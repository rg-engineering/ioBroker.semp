/* eslint-disable prefer-template */



import express from "express";
import type { Server } from "http";
import type { Express } from "express";
import { js2xml, xml2js } from "xml-js";

import Base from "./base";
import type csvLogger from "./csvLogger";
import type Gateway from "./Gateway"; 

import type { deviceInfo } from "./adapter-config";

type TimeoutHandle = ReturnType<typeof setTimeout>;


interface EM2Text<T> {
	_text: T;
}

interface EM2DeviceInput {
	EM2Device: {
		DeviceControl: {
			DeviceId: EM2Text<string>;
			On: EM2Text<boolean>;
			Timestamp: EM2Text<number>;
			RecommendedPowerConsumption?: EM2Text<number>;
		};
	};
}

interface DeviceControlOutput {
	DeviceId: string;
	On: boolean;
	Timestamp: number;
	RecommendedPowerConsumption?: number;
}

interface ConvertResult {
	DeviceControl: DeviceControlOutput;
}

interface Timeframe {
	TimeframeId: number;
	EarliestStart: number;
	LatestEnd: number;
	MaxEnergy: number;
	MinEnergy: number;
	MaxRunningTime: number;
	MinRunningTime: number;
}

interface planningRequest {
	dummy: string;
	Timeframe: Timeframe[];
}

interface PowerInfo {
	dummy: string;
	AveragePower: number;
}

interface PowerConsumption {
	PowerInfo: PowerInfo[];
}

interface deviceStatus{
	dummy: string;
	PowerConsumption: PowerConsumption;
	Status: number;

}

interface device2convert {

	deviceInfo: deviceInfo;
	deviceStatus: deviceStatus;
	planningRequest: planningRequest;

}

interface _attributes {
	xmlns: string;
}

interface convertedDevice {
	
	_attributes: _attributes;
	DeviceInfo: deviceInfo[];
	DeviceStatus: deviceStatus[];
	PlanningRequest: planningRequest[];
}



export default class SEMPServer extends Base {

	uuid: string;
	ipAddress: string;
	port: number;
	descriptionXml: string;
	Gateway: Gateway;

	app: Express;
	server: Server | null;
	extendedLog: boolean;
	DiscoveryheckTimerID: TimeoutHandle | null;
	logger: csvLogger | null;

	/**
	 * Creates a new SEMP Server instance
	 */
	constructor(uuid : string,
		ipAddress: string,
		port: number,
		descriptionXml: string,
		gateway: Gateway,
		extendedLog: boolean,
		logger: csvLogger | null

	) {

		super(gateway.adapter, 0, "SempServer");

		this.uuid = uuid;
		this.ipAddress = ipAddress;
		this.port = port;
		this.descriptionXml = descriptionXml;
		this.Gateway = gateway;

		this.app = express();
		this.initRoutes();
		this.server = null;
		this.extendedLog = extendedLog;
		this.logger = logger;



		this.logDebug("SEMPServer created");

		this.DiscoveryheckTimerID = null;
		this.DiscoveryheckTimerID = setTimeout(this.InfoNotDiscovered.bind(this), 3 * 60 * 1000);


		//this.testtimer = null;
	}


	InfoNotDiscovered(): void {
		this.logError("adapter / gateway not yet discovered by SHM! check adapter and network settings!");
	}

	isEM2DeviceInput(obj: any): obj is EM2DeviceInput {
		return obj?.EM2Device?.DeviceControl != null;
	}

	/**
	 * Initializes SEMP routes
	 */
	initRoutes():void {


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
			this.logDebug("SHM requested all devices. " + req.originalUrl  + " " + req.ip + " " + req.protocol);
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
				const json = xml2js(body, {
					compact: true,
					ignoreDeclaration: true,
					ignoreDoctype: true,
					nativeType: true
				}) as EM2DeviceInput;   

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

	convertJSToXML(js: convertedDevice):string {

		const rawJs = {
			_declaration: {
				_attributes: {
					version: "1.0",
					encoding: "utf-8"
				}
			},
			Device2EM: js
		};

		const ret = js2xml(rawJs, { compact: true, spaces: 4 } );

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
	convertEM2Device(em2dev: EM2DeviceInput): ConvertResult  {
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

		const oRet: ConvertResult = {
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

	


	convertDevices(devices: device2convert[]): convertedDevice {

		//this.Gateway.parentAdapter.log.debug("convert device ");

		const devInfos: deviceInfo[] = [];
		const devStatuses: deviceStatus[] = [];
		const devPlanningRequests: planningRequest[] = [];
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
			} else {
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

	


	async start(): Promise<void> {

		if (!this.port) {
			this.logError("SempServer: Port must be specified!");
			//throw "Port must be specified!";
		}
		if (this.port < 0) {
			this.logError("SempServer: Port has to be greater than 0! " + this.port);
			//throw "Port has to be greater than 0!";
		}

		try {
			this.server = await new Promise<Server>((resolve, reject) => {
				const server = this.app.listen(this.port, () => {
					this.logDebug("SEMP server listening on " + this.port);
					resolve(server);
				});

				server.on("error", (err) => {
					reject(err);
				});
			});
		} catch (error) {
			this.logError("SEMP server cannot start: " + error);
			
		}
	}


	async stop(): Promise<void> {
		this.logDebug("SEMP server stopped");

		const server = this.server;
		if (!server) {
			return;
		}

		await new Promise<void>((resolve, reject) => {
			server.close((err?: Error) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});

		this.server = null;
	}
}




