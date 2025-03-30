

/* todo



*/


class Timeframe {

	constructor(settings, parentAdapter) {

		this.settings = settings.EnergyRequestPeriod;
		this.deviceName = settings.DeviceName;
        this.DishWasherMode = settings.DishWasherMode;

		this.isActive = false;
		this.parentAdapter = parentAdapter;

		this.parentAdapter.log.debug("timeframe constructor " + JSON.stringify(settings));

		this.EarliestStart = -1;
		this.LatestEnd = -1;
		this.MinRunningTime = -1;

		this.MaxRunningTime = -1;
		this.CurrentOnTime = -1;

		this.timediff = 60; 

		this.Status = "Off";

		this.CanceledOnDay = -1;

		this.Prepare();

		this.Start();

		this.UpdateTimesID = null;
		this.UpdateTimesID = setInterval(this.Update.bind(this), this.timediff * 1000);

		this.enabled = true;

	}

	destructor() {
		this.parentAdapter.log.debug("timeframe destructor called " + this.UpdateTimesID);
		if (this.UpdateTimesID != null) {
			clearInterval(this.UpdateTimesID);
			this.UpdateTimesID = null;
			this.parentAdapter.log.debug("timeframe timer killed ");
		}
	}

	SetDeviceStatus(status) {
		this.Status = status;
	}

	async Prepare() {
		await this.createObjects();

		const key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".TimeOn";
		const curVal = await this.parentAdapter.getStateAsync(key);

		if (curVal != null) {
			const vals = curVal.val.split(":");
			if (vals.length > 1) {

				//todo

			}
		}

		await this.GetEnabled();

	}

	Start() {

		try {
			const now = new Date();
			const dayOfWeek = now.getDay();

			this.parentAdapter.log.debug(this.deviceName + " (" + this.settings.ID + ") Start called");

			//if we have canceld it today, do not check again
			if (this.CanceledOnDay != dayOfWeek) {
				this.CanceledOnDay = -1;

				const start = this.settings.EarliestStartTime.split(":");
				const end = this.settings.LatestEndTime.split(":");
				const minRunTimes = this.settings.MinRunTime.split(":");
				const maxRunTimes = this.settings.MaxRunTime.split(":");

				let allchecked = true;
				if (start.length != 2) {
					this.parentAdapter.log.error(this.deviceName + " EarliestStartTime, unsupported time format ' " + this.settings.EarliestStartTime + " ', should be hh:mm");
					allchecked = false;
				}
				if (end.length != 2) {
					this.parentAdapter.log.error(this.deviceName + " LatestEndTime, unsupported time format ' " + this.settings.LatestEndTime + " ', should be hh:mm");
					allchecked = false;
				}
				if (minRunTimes.length != 2) {
					this.parentAdapter.log.error(this.deviceName + " MinRunTime, unsupported time format ' " + this.settings.MinRunTime + " ', should be hh:mm");
					allchecked = false;
				}
				if (maxRunTimes.length != 2) {
					this.parentAdapter.log.error(this.deviceName + " MaxRunTime, unsupported time format ' " + this.settings.MaxRunTime + " ', should be hh:mm");
					allchecked = false;
				}

				//check days
				this.parentAdapter.log.debug(this.deviceName + " (" + this.settings.ID +  ") check run today  " + dayOfWeek + " " + this.settings.Days);
				let runToday = false;
				if (this.settings.Days == "everyDay") {
					runToday = true;
				}
				else if (this.settings.Days == "Monday" && dayOfWeek == 1) {
					runToday = true;
				}
				else if (this.settings.Days == "Tuesday" && dayOfWeek == 2) {
					runToday = true;
				}
				else if (this.settings.Days == "Wednesday" && dayOfWeek == 3) {
					runToday = true;
				}
				else if (this.settings.Days == "Thursday" && dayOfWeek == 4) {
					runToday = true;
				}
				else if (this.settings.Days == "Friday" && dayOfWeek == 5) {
					runToday = true;
				}
				else if (this.settings.Days == "Saturday" && dayOfWeek == 6) {
					runToday = true;
				}
				else if (this.settings.Days == "Sunday" && dayOfWeek == 0) {
					runToday = true;
				}


				if (allchecked && runToday) {

					const StartTime = new Date();
					StartTime.setHours(start[0]);
					StartTime.setMinutes(start[1]);
					StartTime.setSeconds(0);

					const EndTime = new Date();
					EndTime.setHours(end[0]);
					EndTime.setMinutes(end[1]);
					EndTime.setSeconds(0);

					const StartIn = StartTime.getTime() - now.getTime();
					const EndIn = EndTime.getTime() - now.getTime();

					if (StartIn < 0) {
						this.EarliestStart = 0;
					}
					else {
						this.EarliestStart = Math.floor(StartIn / 1000);
					}

					if (EndIn < 0) {
						this.LatestEnd = 0;
					}
					else {
						this.LatestEnd = Math.floor(EndIn / 1000);
					}

					this.MinRunningTime = (minRunTimes[0] * 60 * 60) + (minRunTimes[1] * 60);
					this.MaxRunningTime = (maxRunTimes[0] * 60 * 60) + (maxRunTimes[1] * 60);

					this.CurrentOnTime = 0;

				}
				else {
					this.EarliestStart = -1;
					this.LatestEnd = -1;
					this.MinRunningTime = -1;
					this.MaxRunningTime = -1;
					this.CurrentOnTime = -1;
				}
			}
			this.parentAdapter.log.debug(this.deviceName + " timeframe " + this.settings.ID + " start earliest: " + this.EarliestStart + " latest: " + this.LatestEnd + " MinRunTime: " + this.MinRunningTime + " MaxRuntime: " + this.MaxRunningTime);
		}
		catch (e) {
			this.parentAdapter.log.error("exception in timeframe start [" + e + "]");
		}
	}


	async GetEnabled() {
		const key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".active";

		const current = await this.parentAdapter.getStateAsync(key);

		//this.parentAdapter.log.debug(key +  ": timeframe " + JSON.stringify(current));

		if (current != null) {

			if (current.val == true || current.val == "true") {
				this.enabled = true;
				//this.parentAdapter.log.debug( "timeframe enabled " );
			}
			else {
				this.enabled = false;
				//this.parentAdapter.log.debug( "timeframe disabled ");
			}
		}
	}


	Update() {

		this.GetEnabled();

		this.EarliestStart = this.EarliestStart - this.timediff;
		if (this.EarliestStart < 0) {
			this.EarliestStart = 0;
		}
		this.LatestEnd = this.LatestEnd - this.timediff;
		if (this.LatestEnd < 0) {
			this.LatestEnd = 0;
		}

		if (this.EarliestStart == 0 && this.LatestEnd > 0) {
			this.isActive = true;

			if (this.Status == "On") {

				this.CurrentOnTime = this.CurrentOnTime + this.timediff;

				this.MinRunningTime = this.MinRunningTime - this.timediff;
				if (this.MinRunningTime < 0) {
					this.MinRunningTime = 0;
				}
				this.MaxRunningTime = this.MaxRunningTime - this.timediff;
				if (this.MaxRunningTime < 0) {
					this.MaxRunningTime = 0;
				}
			}
		}
		if (this.EarliestStart > 0 || this.LatestEnd > 0) {
			this.parentAdapter.log.debug(this.deviceName + " timeframe " + this.settings.ID + " update earliest: " + this.EarliestStart + " latest: " + this.LatestEnd + " MinRunTime: " + this.MinRunningTime + " MaxRuntime: " + this.MaxRunningTime);
		}
		else {
			this.parentAdapter.log.debug(this.deviceName + " timeframe " + this.settings.ID + " inactive");
		}
	}

	getTimeframeData() {

		let timeframeData = null;

		//const key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".active";

		//const current = await this.parentAdapter.getStateAsync(key);

		//this.parentAdapter.log.warn(key +  ": timeframe enabled " + JSON.stringify(current));

		//if (current != null) {

		if (this.enabled) {
			if (this.EarliestStart > 0 || this.LatestEnd > 0) {
				timeframeData = {

					TimeframeId: this.settings.ID,
					DeviceId: "", //to be filled later
					EarliestStart: this.EarliestStart,
					LatestEnd: this.LatestEnd,
					MinRunningTime: this.MinRunningTime,
					MaxRunningTime: this.MaxRunningTime,
				};
			}

			this.parentAdapter.log.debug(this.deviceName + " ( " + this.settings.ID + ") timeframe data " + JSON.stringify(timeframeData));

			const key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".LastSent";

			this.parentAdapter.setState(key, { ack: true, val: JSON.stringify(timeframeData) });
		}
		else {
			this.parentAdapter.log.debug(this.deviceName + " ( " + this.settings.ID + ") timeframe disabled by user ");
		}

		//else {
		//	this.parentAdapter.log.error(this.deviceName + " ( " + this.settings.ID + ") timeframe active not readable ");
		//}


		return timeframeData;
	}


	Check2Switch() {
		let SwitchOff = false;
		const restart = false;

		if (this.isActive) {
			this.parentAdapter.log.debug(this.deviceName + " (" + this.settings.ID + ")  000");
			if (this.MaxRunningTime == 0) {
				//SwitchOff = true; //done below
				this.parentAdapter.log.debug(this.deviceName + " turn device off at end of MaxRunTime");
				//this.LatestEnd = 0; //stop energy request too
				this.CancelActiveTimeframe();
			}
			else {
				this.parentAdapter.log.debug(this.deviceName + " (" + this.settings.ID + ")  111");
			}


			if (this.EarliestStart == 0 && this.LatestEnd == 0) {


				//xxx hier im Spülmaschinen-Modus nicht ausschalten
				if (this.DishWasherMode) {
					this.parentAdapter.log.debug(this.deviceName + " not to turn device off at end of LatestEnd, dishwasher");
				}
				else {
					SwitchOff = true;
					this.parentAdapter.log.debug(this.deviceName + " turn device off at end of LatestEnd");
					
				}
				this.isActive = false;
				this.Start();
			}
			else {
				this.parentAdapter.log.debug(this.deviceName + " (" + this.settings.ID + ")  222");
			}
		}
		else {
			this.Start();
			this.parentAdapter.log.debug(this.deviceName + " (" + this.settings.ID + ")  333");
		}
		this.UpdateObjects();

		this.parentAdapter.log.debug(this.deviceName + " (" + this.settings.ID + ") check end of max runtime " + SwitchOff + " " + this.isActive);

		const ret = {
			SwitchOff: SwitchOff,
			restart: restart
		};

		return ret;

	}

	CancelActiveTimeframe() {
		if (this.isActive) {
			this.EarliestStart = 0;
			this.LatestEnd = 0;

			//make sure not to restart today
			const now = new Date();
			const dayOfWeek = now.getDay();
			this.CanceledOnDay = dayOfWeek;
		}
	}

	//=============================================================
	async createObjects() {

		let key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".TimeOn";
		let obj = {
			type: "state",
			common: {
				name: "On Time",
				type: "string",
				role: "value.time",
				unit: "hh:mm",
				read: true,
				write: false,
				desc: "how long the device is already on"
			}
		};
		await this.CreateObject(key, obj);

		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".RemainingMaxOnTime";
		obj = {
			type: "state",
			common: {
				name: "remaining max. On Time",
				type: "string",
				role: "value.time",
				unit: "hh:mm",
				read: true,
				write: false,
				desc: "how long the device remains on"
			}
		};
		await this.CreateObject(key, obj);

		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".UsingExcessEnergy";
		obj = {
			type: "state",
			common: {
				name: "device is using excess energy",
				type: "boolean",
				role: "value",
				unit: "",
				read: true,
				write: false,
				desc: "info, whether excess energy is used"
			}
		};
		await this.CreateObject(key, obj);


		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".LastSent";
		obj = {
			type: "state",
			common: {
				name: "debug: last sent data for this timeframe",
				type: "string",
				role: "value",
				unit: "",
				read: true,
				write: false,
				desc: "info, what data were sent to SHM"
			}
		};
		await this.CreateObject(key, obj);

		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".active";
		obj = {
			type: "state",
			common: {
				name: "timeframe is active",
				type: "boolean",
				role: "value",
				unit: "",
				read: true,
				write: true,
				desc: "switch to enable / disable timeframe"
			}
		};
		await this.CreateObject(key, obj);
		this.SetDefault(key, "true");

	}

	async CreateObject(key, obj) {

		const obj_new = await this.parentAdapter.getObjectAsync(key);
		//adapter.log.warn("got object " + JSON.stringify(obj_new));

		if (obj_new != null) {

			if ((obj_new.common.role != obj.common.role
                || obj_new.common.type != obj.common.type
                || (obj_new.common.unit != obj.common.unit && obj.common.unit != null)
                || obj_new.common.read != obj.common.read
                || obj_new.common.write != obj.common.write
                || obj_new.common.name != obj.common.name
                || obj_new.common.desc != obj.common.desc)
                && obj.type === "state"
			) {
				this.parentAdapter.log.warn("change object " + JSON.stringify(obj) + " " + JSON.stringify(obj_new));
				await this.parentAdapter.extendObject(key, {
					common: {
						name: obj.common.name,
						role: obj.common.role,
						type: obj.common.type,
						unit: obj.common.unit,
						read: obj.common.read,
						write: obj.common.write,
						desc: obj.common.desc
					}
				});
			}
		}
		else {
			await this.parentAdapter.setObjectNotExistsAsync(key, obj);
		}
	}

	async SetDefault(key, value) {
		const current = await this.parentAdapter.getStateAsync(key);
		//set default only if nothing was set before
		if (current === null || current === undefined || current.val === undefined) {
			this.parentAdapter.log.info("set default " + key + " to " + value);
			await this.parentAdapter.setStateAsync(key, { ack: true, val: value });
		}
	}


	UpdateObjects() {
		let Hour = Math.floor(this.CurrentOnTime / 60 / 60);
		let Minutes = Math.floor((this.CurrentOnTime - (Hour * 60 * 60)) / 60);
		let sHour = "0";
		if (Hour < 10) {
			sHour = "0" + Hour;
		}
		else {
			sHour = Hour;
		}
		let sMinutes = "0";
		if (Minutes < 10) {
			sMinutes = "0" + Minutes;
		}
		else {
			sMinutes = Minutes;
		}

		let val = sHour + ":" + sMinutes;

		let key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".TimeOn";

		this.parentAdapter.setState(key, { ack: true, val: val });

		//=======================================================
		let isExcessEnergy = false;

		if (this.MinRunningTime == 0 &&  this.Status == "On") {
			isExcessEnergy = true;
		}

		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".UsingExcessEnergy";
		this.parentAdapter.setState(key, { ack: true, val: isExcessEnergy });

		//=======================================================
		val = "00:00";

		Hour = Math.floor((this.LatestEnd - this.EarliestStart)/ 60 / 60);
		Minutes = Math.floor(((this.LatestEnd - this.EarliestStart) - (Hour * 60 * 60)) / 60);
		sHour = "0";
		if (Hour < 10) {
			sHour = "0" + Hour;
		}
		else {
			sHour = Hour;
		}
		sMinutes = "0";
		if (Minutes < 10) {
			sMinutes = "0" + Minutes;
		}
		else {
			sMinutes = Minutes;
		}

		val = sHour + ":" + sMinutes;


		key = "Devices." + this.deviceName + ".TimeFrames." + this.settings.ID + ".RemainingMaxOnTime";

		this.parentAdapter.setState(key, { ack: true, val: val });
	}


	GetIsActive() {
		return this.isActive;
	}
}


module.exports = {
	Timeframe
};