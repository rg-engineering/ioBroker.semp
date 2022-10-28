"use strict";

/*
 * Created with @iobroker/create-adapter v2.1.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const networkInterfaces = require('os').networkInterfaces;
const { v4: uuidv4 } = require('uuid');

const Gateway = require("./lib/semp/Gateway").Gateway;


/* to do

* Hinweise im admin:
	* DeviceID Format
    * UUID
    * BaseID
    * 
 * admin
 *	ID nur ändern, wenn sie nicht dem Format entspricht
 *	
 *	readme bzgl. der einstellbaren Parameter vervollständigen
 *	
 *	
 *	
 *	Geräte nach Ende der max Laufzeit ausschalten, damit sie beim nächsten Start wieder angeschaltet werden können? -> max. als Option laut Doku
 *	warum schickt shm manchmal alle Minute ein On:true, und manchmal nicht? -> wenn nicht von false auf true wechselt
 *	Anlauferkennung? -> erledigt
 *	max. Leistung: wie/wann kommt das?
 *	
 *	EnergieAnforderung zurückziehen, wenn Gerät nicht einschaltet, Zeit einstellbar
 *	Energieanforderung abbrechen, wenn Gerät ausschaltet, Zeit einstellbar
 *	Time umbenenenn in "Zeit für EnergieAnforderung"
 *	Feiertag / Urlaub zu hause für Timer hinzufügen
 *	mehrere Anforderungen pro Tag

Admin umbennenen oder Übersetzung:
 * Basis-ID der Geräte
 * Hinweis bei Zähler-tab
 * Objekt-ID Power
 * Einschätzung -> Schätzung
 * Hinweis im Schalter-tab
 * immer auf -> immer ein
 * hat Objekt-ID-Schalter ???
 * Timer-tab -> Zeitsteuerung für Energieanforderung


*/

class Semp extends utils.Adapter {



	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "semp",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));

		this.gw = null;
		//this.DummyDeviceUpdateIntervalID = null;

		//this.RequestTimerID = null;
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {

		try {
			//"290B3891-0311-4854-4333-7C70BC802C2D"
			let uuid = this.config.UUID;
			let ip = this.config.IPAddress;
			//9765
			let sempPort = this.config.SempPort;
			//"ioBroker Gateway"
			let name = this.config.SempName;
			//"ioBroker"
			let manufacturer = this.config.SempManufacturer;

			if (!ip) {
				this.log.error("IP not specified!");
			}
			else if (!sempPort) {
				this.log.error("Port not specified!");
			}
			else if (!uuid) {
				this.log.error("UUID not specified!");
			}
			else {

				this.gw = new Gateway(this, uuid, ip, sempPort, name, manufacturer);
				if (this.gw != null) {
					await this.gw.start();
					this.log.debug("Started all!");

					//=================================
					//just for test:
					//this.gw.addDummyDevice();

					//this.DummyDeviceUpdateIntervalID = setInterval(this.UpdateDummyDevice.bind(this), 1 * 60 * 1000);
					//=================================

					await this.AddDevices();
					//this.checkRequests();
					//this.StartRequstIntervall();

					this.UpdateData();
				}
			}

			/*
			// examples for the checkPassword/checkGroup functions
			let result = await this.checkPasswordAsync("admin", "iobroker");
			this.log.info("check user admin pw iobroker: " + result);
	
			result = await this.checkGroupAsync("admin", "admin");
			this.log.info("check group user admin group admin: " + result);
			*/
		} catch (e) {
			this.log.error("exception in onReady [" + e + "]");
		}
	}

	UpdateData() {
		this.log.debug("UpdateData");
		try {
			for (let d = 0; d < this.config.devices.length; d++) {

				this.log.debug("device " + JSON.stringify(this.config.devices[d]));

				/*
				exception in UpdateData[TypeError: this.config.devices[d].push is not a function]
				2022 - 10 - 24 15: 48: 50.637	warn	use old energy request data with new data structure, please save it in admin
				2022 - 10 - 24 15: 48: 50.636	debug	device { "IsActive": true, "ID": "F-53088660-100000000001-00", "Name": "Spülie", "Type": "DishWasher", "MeasurementMethod": "Measurement", "InterruptionsAllowed": true, "MaxPower": "124", "Vendor": "BoschSiemens", "SerialNr": "B12345678ABCD", "OptionalEnergy": true, "OID_Power": "javascript.0.semp.Device1_Power", "StatusDetection": "SeparateOID", "OID_OnOff": "javascript.0.semp.Device1_OnOff", "MinOnTime": "2400", "MaxOnTime": "5001", "MinOffTime": "2300", "MaxOffTime": "4000", "OID_Status": "javascript.0.semp.Device1_OnOff", "HasOIDSwitch": true, "OID_Switch": "javascript.0.semp.Device1_OnOff", "TimerActive": true, "TimerStart": "09:30", "TimerEnd": "12:00", "TimerMinRunTime": "00:30", "TimerMaxRunTime": "00:45", "TimerEveryDay": true, "TimerMonday": false, "TimerTuesday": false, "TimerWednesday": false, "TimerThursday": false, "TimerFriday": false, "TimerSaturday": false, "TimerSunday": false, "StatusDetectionLimit": "0", "StatusDetectionLimitTime": "0", "StatusDetectionLimitTimeOn": "0", "StatusDetectionLimitTimeOff": "0", "StatusDetectionMinRunTime": "0", "SwitchOffAtEndOfTimer": false, "TimerCancelIfNotOn": true, "TimerCancelIfNotOnTime": "5" }
				2022 - 10 - 24 15: 48: 50.636	debug	UpdateData
				
				
				
				result [{"IsActive":true,"ID":"F-53088660-100000000001-00","Name":"Spülie","Type":"DishWasher","MeasurementMethod":"Measurement","InterruptionsAllowed":true,"MaxPower":"124","Vendor":"BoschSiemens","SerialNr":"B12345678ABCD","OptionalEnergy":true,"OID_Power":"javascript.0.semp.Device1_Power","StatusDetection":"SeparateOID","OID_OnOff":"javascript.0.semp.Device1_OnOff","MinOnTime":"2400","MaxOnTime":"5001","MinOffTime":"2300","MaxOffTime":"4000","OID_Status":"javascript.0.semp.Device1_OnOff","HasOIDSwitch":true,"OID_Switch":"javascript.0.semp.Device1_OnOff","TimerActive":true,"TimerStart":"09:30","TimerEnd":"12:00","TimerMinRunTime":"00:30","TimerMaxRunTime":"00:45","TimerEveryDay":true,"TimerMonday":false,"TimerTuesday":false,"TimerWednesday":false,"TimerThursday":false,"TimerFriday":false,"TimerSaturday":false,"TimerSunday":false,"StatusDetectionLimit":"0","StatusDetectionLimitTime":"0","StatusDetectionLimitTimeOn":"0","StatusDetectionLimitTimeOff":"0","StatusDetectionMinRunTime":"0","SwitchOffAtEndOfTimer":false,"TimerCancelIfNotOn":true,"TimerCancelIfNotOnTime":"5","EnergyRequestPeriods":[{"ID":1,"EarliestStartTime":"09:30","LatestEndTime":"12:00","MinRunTime":"00:30","MaxRunTime":"00:45","CancelRequestNotOn":true,"MaxTimeToOn":"5","CancelRequestAfterOff":false,"MinTimeAfterOff":"00:00"}]},{"IsActive":true,"ID":"F-53088660-000000000002-00","Name":"newDevice1","Vendor":"noName","Type":"Other","SerialNr":"ABCDEFGE","MaxPower":"500","InterruptionsAllowed":false,"MinOnTime":"","MaxOnTime":"","MinOffTime":"","MaxOffTime":"","MeasurementMethod":"Measurement","OID_Power":"javascript.0.semp.Device2_Power","StatusDetection":"FromPowerValue","OID_Status":"javascript.0.semp.Device2_OnOff","HasOIDSwitch":true,"OID_Switch":"javascript.0.semp.Device2_OnOff","TimerActive":true,"TimerStart":"08:00","TimerEnd":"18:00","TimerEveryDay":true,"TimerMonday":false,"TimerTuesday":false,"TimerWednesday":false,"TimerThursday":false,"TimerFriday":false,"TimerSaturday":false,"TimerSunday":false,"TimerMinRunTime":"00:00","TimerMaxRunTime":"02:30","StatusDetectionLimit":"10","StatusDetectionLimitTime":0,"StatusDetectionLimitTimeOn":"3","StatusDetectionLimitTimeOff":"6","StatusDetectionMinRunTime":"5","SwitchOffAtEndOfTimer":false,"TimerCancelIfNotOn":false,"TimerCancelIfNotOnTime":"10","OptionalEnergy":true,"EnergyRequestPeriods":[{"ID":1,"EarliestStartTime":"08:00","LatestEndTime":"18:00","MinRunTime":"00:00","MaxRunTime":"02:30","CancelRequestNotOn":false,"MaxTimeToOn":"10","CancelRequestAfterOff":false,"MinTimeAfterOff":"00:00"}]}]
				2022-10-24 16:04:16.952	debug	result [{"ID":1,"EarliestStartTime":"08:00","LatestEndTime":"18:00","MinRunTime":"00:00","MaxRunTime":"02:30","CancelRequestNotOn":false,"MaxTimeToOn":"10","CancelRequestAfterOff":false,"MinTimeAfterOff":"00:00"}]
				2022-10-24 16:04:16.951	warn	use old energy request data with new data structure, please save it in admin
				
				
				*/



				if (this.config.devices[d].IsActive && this.config.devices[d].TimerActive) {
					if (this.config.devices[d].EnergyRequestPeriods == null || this.config.devices[d].EnergyRequestPeriods.length == 0) {
						this.log.warn("use old energy request data with new data structure, please save it in admin");


						//is this necessary here???
						//just make it backwards compatible 0.0.4 -> 0.0.3
						let EnergyRequestPeriods = [];
						let energyRequest = {
							ID: 1,
							Days: this.config.devices[d].TimerDays,
							EarliestStartTime: this.config.devices[d].TimerStart,
							LatestEndTime: this.config.devices[d].TimerEnd,
							MinRunTime: this.config.devices[d].TimerMinRunTime,
							MaxRunTime: this.config.devices[d].TimerMaxRunTime,
							CancelRequestNotOn: this.config.devices[d].TimerCancelIfNotOn,
							MaxTimeToOn: this.config.devices[d].TimerCancelIfNotOnTime,
							CancelRequestAfterOff: false,
							MinTimeAfterOff: "10"
						}

						EnergyRequestPeriods.push(energyRequest);

						this.config.devices[d]["EnergyRequestPeriods"] = EnergyRequestPeriods;

					}
				}

				this.log.debug("result " + JSON.stringify(this.config.devices[d].EnergyRequestPeriods));
			}


		} catch (e) {
			this.log.error("exception in UpdateData [" + e + "]");
		}

		this.log.debug("result " + JSON.stringify(this.config.devices));

	}


	/*
	UpdateDummyDevice() {
		this.log.debug("UpdateDummyDevice");
		this.gw.UpdateDummyDevice();
	}
	*/

	/*
	StartRequstIntervall() {

		this.log.debug("start request intervall");

		this.RequestTimerID = setInterval(this.checkRequests.bind(this), 60*1000);
    }
	*/
	


	//add all devices which are configured in admin page
	async AddDevices() {

		for (let d = 0; d < this.config.devices.length; d++) {

			let device = this.config.devices[d];

			this.log.debug("add device " + JSON.stringify(device));

			if (device.IsActive) {
				this.gw.addDevice(device);
				await this.SubscribeDevice(device);

				if (device.MeasurementMethod == "Estimation") {
					this.gw.setPowerDevice(device.ID, device.MaxPower, device.StatusDetection);
				}
				if (device.StatusDetection == "AlwaysOn") {
					this.gw.setOnOffDevice(device.ID, true);
                }

			}
        }
    }

	async SubscribeDevice(device) {

		//is done in device itself
    }

	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
			// clearInterval(interval1);

			/*
			if (this.DummyDeviceUpdateIntervalID != null) {
				clearInterval(this.DummyDeviceUpdateIntervalID);
			}
			*/

			//if (this.RequestTimerID != null) {
			//	clearInterval(this.RequestTimerID);
			//}

			if (this.gw != null) {
				this.gw.stop();
			}
			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	async onStateChange(id, state) {
		if (state) {
			// The state was changed
			let bRet = this.UpdateDevice(id, state);

			if (!bRet) {
				this.log.warn(`state ${id} changed: ${state.val} (ack = ${state.ack}) but not handled`);
            }
		} else {
			// The state was deleted
			this.log.info(`state ${id} deleted`);
		}
	}

	UpdateDevice(id, state) {

		let bRet = false;
		//find device and OID
		for (let d = 0; d < this.config.devices.length; d++) {

			let device = this.config.devices[d];
			if (device.IsActive) {
				if (device.OID_Power === id) {
					this.gw.setPowerDevice(device.ID, state.val);
					bRet = true;
				}

				if (device.OID_Status === id) {
					this.gw.setOnOffDevice(device.ID, state.val);
					bRet = true;
				}
			}
		}

		return bRet;
    }



	/**
	 * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	 * Using this method requires "common.messagebox" property to be set to true in io-package.json
	* @param {ioBroker.Message} obj
	 */
	async onMessage(obj) {
		this.log.info("on message " + JSON.stringify(obj));
		if (typeof obj === "object" && obj.command) {
			if (obj.command === "getIP") {
				this.log.info("get IP");

				let myIP = this.GetIP();
				// Send response in callback if required
				if (obj.callback) this.sendTo(obj.from, obj.command, myIP, obj.callback);
			}
			else if (obj.command === "getUUID") {
				this.log.info("get UUID");

				let uuid = this.GetUUID();
				// Send response in callback if required
				if (obj.callback) this.sendTo(obj.from, obj.command, uuid, obj.callback);
			}
			else if (obj.command === "getDeviceBaseID") {
				this.log.info("get DeviceBaseID");

				let devicebaseid = await this.GetDeviceBaseID();
				// Send response in callback if required
				if (obj.callback) this.sendTo(obj.from, obj.command, devicebaseid, obj.callback);
			}
			else {
				this.log.warn("unknown command " + obj.command);
			}
		}
	}


	GetIP() {
		let ip = "";
		const nets = networkInterfaces();

		for (const name of Object.keys(nets)) {
			for (const net of nets[name]) {
				if (net.family === 'IPv4' && !net.internal) {
					ip = net.address;
				}
			}
		}
		return ip;
    }

	GetUUID() {
		let uuid = "000-todo";

		uuid = uuidv4();

		return uuid;
	}

	async GetDeviceBaseID() {
		let devicebaseid = "12345678";

		const ret = await this.getForeignObjectAsync("system.config");

		if (ret != null) {
			this.log.debug("system config " + JSON.stringify(ret));

			let latidude = ret.common.latitude;

			devicebaseid = ("00000000" + latidude * 100000000).slice(-8);
		}
		return devicebaseid;
    }

}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Semp(options);
} else {
	// otherwise start the instance directly
	new Semp();
}