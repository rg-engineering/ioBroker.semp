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



* Estimation -> keine Power holen sondern Wert direkt verwenden
* StatusDetection : SeparateOID;FromPowerValue;AlwaysOn hinzufügen

* Hinweise im admin:
	* DeviceID Format
    * UUID
    * BaseID
    * 
 * admin
 *	ID nur ändern, wenn sie nicht dem Format entspricht
 *	
 *	readme bzgl. der einstellbaren Parameter vervollständigen


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

		this.RequestTimerID = null;
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
					this.checkRequests();
					this.StartRequstIntervall();
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

	/*
	UpdateDummyDevice() {
		this.log.debug("UpdateDummyDevice");
		this.gw.UpdateDummyDevice();
	}
	*/

	StartRequstIntervall() {

		this.log.debug("start request intervall");

		this.RequestTimerID = setInterval(this.checkRequests.bind(this), 60*1000);
    }

	checkRequests() {

		this.log.debug("calculate request times");

		try {
			for (let d = 0; d < this.config.devices.length; d++) {
				let device = this.config.devices[d];

				if (device.IsActive && device.TimerActive) {

					let id = device.ID;
					let earliestStart = 0;
					let latestEnd = 0;
					let minRunTime = 0;
					let maxRunTime = 0;
					let runDays = device.TimerDays;

					let now = new Date();
					let dayOfWeek = now.getDay();

					let start = device.TimerStart.split(":");
					let end = device.TimerEnd.split(":");
					let minRunTimes = device.TimerMinRunTime.split(":");
					let maxRunTimes = device.TimerMaxRunTime.split(":");

					let allchecked = true;
					if (start.length != 2) {
						this.log.error("unsupported time format " + device.TimerStart + ", should be hh:mm");
						allchecked = false;
					}
					if (end.length != 2) {
						this.log.error("unsupported time format " + device.TimerEnd + ", should be hh:mm");
						allchecked = false;
					}
					if (minRunTimes.length != 2) {
						this.log.error("unsupported time format " + device.TimerMinRunTime + ", should be hh:mm");
						allchecked = false;
					}
					if (maxRunTimes.length != 2) {
						this.log.error("unsupported time format " + device.TimerMaxRunTime + ", should be hh:mm");
						allchecked = false;
					}

					//check days
					this.log.debug("check run today " + runDays + " " + dayOfWeek);
					let runToday = false;
					if (runDays.includes("everyDay")) {
						runToday = true;
					}
					else if (runDays.includes("Monday") && dayOfWeek == 1) {
						runToday = true;
					}
					else if (runDays.includes("Tuesday") && dayOfWeek == 2) {
						runToday = true;
					}
					else if (runDays.includes("Wednesday") && dayOfWeek == 3) {
						runToday = true;
					}
					else if (runDays.includes("Thursday") && dayOfWeek == 4) {
						runToday = true;
					}
					else if (runDays.includes("Friday") && dayOfWeek == 5) {
						runToday = true;
					}
					else if (runDays.includes("Saturday") && dayOfWeek == 6) {
						runToday = true;
					}
					else if (runDays.includes("Sunday") && dayOfWeek == 0) {
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
								earliestStart = StartIn / 1000;
							}

							if (EndIn < 0) {
								latestEnd = 0;
							}
							else {
								latestEnd = EndIn / 1000;
							}

							minRunTime = (minRunTimes[0] * 60 * 60) + (minRunTimes[1] * 60);
							maxRunTime = (maxRunTimes[0] * 60 * 60) + (maxRunTimes[1] * 60);

							this.log.debug("Start " + StartTime.toLocaleTimeString() + " End " + EndTime.toLocaleTimeString() + " earliest " + earliestStart + " latest " + latestEnd);

							//later: todo find right request in list, now e use only one
							if (this.gw.getNoOfPlanningRequests(id) < 1) {
								this.gw.addPlanningRequest(id, earliestStart, latestEnd, minRunTime, maxRunTime);
							}
							else {
								let reqId = 0; //always the first in list (todo: find the right one if we use more then one)
								this.gw.updatePlanningRequest(reqId, id, earliestStart, latestEnd, minRunTime, maxRunTime);
							}
						}
						else {
							//what to do if not run today??? todo
							this.log.debug("nothing to run today");
						}
					}
					else {
						this.log.debug("not started due to error on pre-check");
					}
				}
				else {
					//todo something to do?
					this.log.debug("not active");
                }
			}
		}
		catch (e) {
			this.log.error("exception in checkRequests [" + e + "]");
		}
	}


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

		if (device.MeasurementMethod == "Measurement") {
			if (device.OID_Power != null && device.OID_Power.length > 5) {
				this.log.debug("subscribe OID_Power " + device.OID_Power);
				this.subscribeForeignStates(device.OID_Power);

				//and get last value
				let current = await this.getForeignStateAsync(device.OID_Power);
				if (current != null && current.val != null) {
					this.gw.setPowerDevice(device.ID, current.val, device.StatusDetection);
				}

			}
		}


		//todo nochmal prüfen
		if (device.StatusDetection == "SeparateOID") {
			if (device.OID_OnOff != null && device.OID_OnOff.length > 5) {
				this.log.debug("subscribe OID_OnOff " + device.OID_OnOff);
				this.subscribeForeignStates(device.OID_OnOff);

				//and get last value
				let current = await this.getForeignStateAsync(device.OID_OnOff);
				if (current != null && current.val != null) {
					this.gw.setOnOffDevice(device.ID, current.val);
				}
			}
		}
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

			if (this.RequestTimerID != null) {
				clearInterval(this.RequestTimerID);
			}

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

			/*
				state javascript.0.semp.Device1_OnOff changed: true(ack = false)
				state javascript.0.semp.Device1_Power changed: 73.32042175039992(ack = false)
				*/


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
				if (device.OID_Power == id) {
					this.gw.setPowerDevice(device.ID, state.val);
					bRet = true;
				}

				if (device.OID_OnOff == id) {
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