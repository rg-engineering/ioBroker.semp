/* eslint-disable prefer-template */

/*
Pseudocode / Plan (schrittweise, detailliert):
1. Typen für alle Methodenparameter ergänzen, die aktuell implizit `any` sind:
   - `setOnOffDevice(id: string, state: boolean | string)`
   - `setWallboxPlugConnected(id: string, state: boolean)`
   - `setWallboxIsCharging(id: string, state: boolean)`
   - `setWallboxIsError(id: string, state: boolean)`
   - `setMinEnergy(id: string, state: number)`
   - `setMaxEnergy(id: string, state: number)`
   - `EnableFastCharging(id: string, state: boolean)`
   - `SetMaxChargeTime(id: string, state: number)`
   - `addDevice(device: any)`
   - `setDevice(id: string, device: Device)`
   - `getDevice(id: string): Device | undefined`
   - `onSEMPMessage(message: any): Promise<void>`

2. Fehler wegen fehlender Properties auf `Device` (z.B. `deviceInfo`, `planningrequest`) behandeln:
   - Da `Device`-Klasse möglicherweise nicht alle Typen exportiert, bei Bedarf auf `any` casten,
     nur an den Stellen, wo auf diese nicht-typisierten Felder zugegriffen wird.
   - Sicherstellen, dass Werte nicht `undefined` sind, bevor Methoden wie `Check2Switch()` aufgerufen werden.

3. `getAllDevices()`:
   - Für jede Device-Instanz lokale Variable `dev` verwenden (kein zusätzlicher Lookup nötig).
   - Vor Aufruf von Methoden/Properties mit möglicher Unsicherheit mit `as any` casten und auf `null/undefined` prüfen.
   - Aufbau des Rückgabeobjekts mit gecasteten `deviceInfo`/`deviceStatus`.

4. Minimum invasiv und kompiliersicher: Typen ergänzen, Guards hinzufügen, gezielt `as any` verwenden,
   um Compilerfehler (TS2339 / TS18048 / TS7006) zu beheben, ohne tiefe Änderungen an Logik.

Jetzt die angepasste Datei mit Typen und Guards.
*/

import type { Semp } from "../main";
import csvLogger from "./csvLogger";
import SSDPServer from "./SSDPServer";
import SEMPServer from "./SEMPServer";
import DescriptionGenerator from "./DescriptionGenerator";
import Device from "./Device";
import Base from "./base";

export default class Gateway extends Base{

	parentAdapter: Semp | null = null;
	csvLogger: csvLogger | null = null;
	ssdpServer: SSDPServer | null = null;
	sempServer: SEMPServer | null = null;
	devices: Map<string, Device>;

	constructor(
		parentAdapter: Semp,
		uuid: string,
		ipAddress: string,
		sempPort: number,
		friendlyName: string,
		manufacturer:string) {

		super(parentAdapter, 0, "Gateway");

		this.parentAdapter = parentAdapter;

		this.csvLogger = null;
		if (parentAdapter.config.LogToCSV) {
			this.csvLogger = new csvLogger(parentAdapter);

			const header = [
				{ id: "Time", title: "Time" },                                      //Column1
				{ id: "DeviceId", title: "DeviceId" },                              //Column2
				{ id: "DeviceName", title: "DeviceName" },                          //Column3
				{ id: "Status", title: "Status" },                                  //Column4
				{ id: "AveragePower", title: "AveragePower" },                      //Column5
				{ id: "TimeFrameID", title: "TimeFrameID" },                        //Column6
				{ id: "EarliestStart", title: "EarliestStart" },                    //Column7
				{ id: "LatestEnd", title: "LatestEnd" },                            //Column8
				{ id: "MinRunningTime", title: "MinRunningTime" },                  //Column9
				{ id: "MaxRunningTime", title: "MaxRunningTime" },                  //Column10
				{ id: "MinEnergy", title: "MinEnergy" },                            //Column11
				{ id: "MaxEnergy", title: "MaxEnergy" },                            //Column12
				{ id: "RecommendationStatus", title: "RecommendationStatus" },      //Column13
				{ id: "RecommendationPower", title: "RecommendationPower" },        //Column14
				{ id: "Power", title: "Power" },                                    //Column15
				//{ id: 'LastTimeStamp', title: 'LastTimeStamp' },                    //Column16
				{ id: "Timediff", title: "Timediff" },                              //Column17
				{ id: "Energy", title: "Energy" }                                   //Column18
			];

			this.csvLogger.StartLog(parentAdapter.config.LogToCSVPath, header);

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
			this.csvLogger.WriteCSVLog(0, records);
		}

		this.ssdpServer = new SSDPServer("http://" + ipAddress + ":" + sempPort + "/description.xml", uuid, this);

		const descriptionXml = DescriptionGenerator.generateDescription(uuid, "http://" + ipAddress + ":" + sempPort, friendlyName, manufacturer, "/semp");
		this.sempServer = new SEMPServer(uuid, ipAddress, sempPort, descriptionXml, this, parentAdapter.config.extendedLog, this.csvLogger);

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
			await this.ssdpServer.start();

			this.logDebug("gateway started...");
		} catch (e) {
			this.logError("exception in start [" + e + "]");
		}
	}

	async stop() {

		if (this.sempServer == null || this.ssdpServer == null || this.parentAdapter == null) {
            this.logError("cannot stop gateway, servers or parentAdapter are undefined");
			return;
		}

		try {
			//kill device timer
			this.deleteAllDevices();

			await this.sempServer.stop();
			await this.ssdpServer.stop();
			this.logDebug("gateway stopped...");
		} catch (e) {
			this.logError("exception in stop [" + e + "]");
		}
	}

	setPowerDevice(id: string, power:number) {
		const d = this.getDevice(id);
		if (d != null) {
			(d as any).setLastPower(power, null, null);
		} else {
			this.logError("unknown device with id " + id);
		}
	}

	setOnOffDevice(id: string, state: boolean | string) {

		let newState = "";
		if (typeof state === "boolean") {
			if (state) {
				newState = "On";
			} else {
				newState = "Off";
			}
		} else if (typeof state === "string") {
			if (state.toLowerCase().includes("on")) {
				newState = "On";
			} else {
				newState = "Off";
			}
		}

		const d = this.getDevice(id);
		if (d != null) {
			(d as any).setOnOff(newState);
		} else {
			this.logError("unknown device with id " + id);
		}
	}

	//====================================
	//wallbox
	setWallboxPlugConnected(id: string, state: boolean) {
		const d = this.getDevice(id);
		if (d != null) {
			(d as any).setWallboxPlugConnected(state);
		} else {
			this.logError("unknown device with id " + id);
		}
	}

	setWallboxIsCharging(id: string, state: boolean) {
		const d = this.getDevice(id);
		if (d != null) {
			(d as any).setWallboxIsCharging(state);
		} else {
			this.logError("unknown device with id " + id);
		}
	}
	setWallboxIsError(id: string, state: boolean) {
		const d = this.getDevice(id);
		if (d != null) {
			(d as any).setWallboxIsError(state);
		} else {
			this.logError("unknown device with id " + id);
		}
	}
	setMinEnergy(id: string, state: number) {
		const d = this.getDevice(id);
		if (d != null) {
			this.logDebug("GW set minEnergy " + state);
			(d as any).setMinEnergy(state);
		} else {
			this.logError("unknown device with id " + id);
		}
	}
	setMaxEnergy(id: string, state: number) {
		const d = this.getDevice(id);
		if (d != null) {
			this.logDebug("GW set maxEnergy " + state);
			(d as any).setMaxEnergy(state);
		} else {
			this.logError("unknown device with id " + id);
		}
	}

	EnableFastCharging(id: string, state: boolean) {
		const d = this.getDevice(id);
		if (d != null) {
			this.logDebug("GW enable fast charging " + state);
			(d as any).EnableFastCharging(state);
		} else {
			this.logError("unknown device with id " + id);
		}
	}

	SetMaxChargeTime(id: string, state: number) {
		const d = this.getDevice(id);
		if (d != null) {
			this.logDebug("GW set max charge time " + state);
			(d as any).SetMaxChargeTime(state);
		} else {
			this.logError("unknown device with id " + id);
		}
	}


	//====================================

	addDevice(device: any) {

		try {
			this.logDebug("add device " + device.ID);

			const d = new Device(this, device, this.csvLogger);

			this.setDevice(device.ID, d);

		} catch (e) {
			this.logError("exception in addDevice [" + e + "]");
		}
	}

	setDevice(id: string, device: Device) {
		this.logDebug("set device ");
		this.devices.set(id, device);
	}

	getDevice(id: string): Device | undefined {
		//this.parentAdapter.log.debug("get device " + id);
		return this.devices.get(id);
	}

	getAllDevices() {
		const ds: any[] = [];
		try {
			this.logDebug("get all devices ");

			for (const d of this.devices.values()) {
				// `d` ist bereits die Device-Instanz
				const dev = d;

				// Check2Switch aufrufen (Device-Methode kann nicht typsicher bekannt sein)
				try {
					// falls vorhanden aufrufen
					if (typeof (dev as any).Check2Switch === "function") {
						(dev as any).Check2Switch();
					}
				} catch (err) {
					this.logError("error in Check2Switch [" + err + "]");
				}

				let requests: any[] = [];

				if ((dev as any).planningrequest != null) {
					requests = (dev as any).planningrequest.getPlanningrequestData();

					for (let r = 0; r < requests.length; r++) {
						// deviceInfo möglicherweise nicht typisiert => casten
						requests[r].DeviceId = (d as any).deviceInfo.Identification.DeviceId;
					}
				}
				const planningRequest = {
					Timeframe: requests
				};

				const device = {
					deviceInfo: (d as any).deviceInfo,
					deviceStatus: (d as any).deviceStatus,
					planningRequest: planningRequest
				};
				ds.push(device);
			}
		} catch (e) {
			this.logError("exception in getAllDevices [" + e + "]");
		}

		return ds;
	}

	deleteDevice(id:string) {

		this.logDebug("delete device " + id);

		return this.devices.delete(id);
	}

	deleteAllDevices() {

		this.logDebug("delete all devices");

		this.devices.clear();
	}

	async onSEMPMessage(message: any) {

		this.logDebug("semp message " + JSON.stringify(message));

		const d = this.getDevice(message.DeviceControl.DeviceId);
		if (d) {
			await (d as any).sendEMRecommendation(message);
		}
	}
}



module.exports = {
	Gateway
};
