/* eslint-disable prefer-template */
/* eslint-disable quote-props */
/* eslint-disable prettier/prettier */

import type { SempDevice } from './types';


export default class LegacyMigrator {

    static migrate(
        native: any,
        getIsChanged: (native: any) => boolean,
        setState: (s: Partial<any>) => void
    ): void {
        if (native === undefined || native === null) {
            return;
        }

        let totalChanged = 0;
        try {
            const res = this.removeEntries(native);
            native = res.native;
            totalChanged = res.removed;
        } catch (err) {
            // Fehler protokollieren, aber Migration fortsetzen
            console.warn("migrate exception ignored " + err);
        }

        // Versuche Wallbox OIDs aus der ursprünglichen Konfiguration zu übernehmen
        try {
            const res = this.populateWallboxOids(native);
            native = res.native;
            totalChanged += res.changed;
        } catch (e) {
            // Fehler protokollieren, aber Migration fortsetzen
            console.warn("populateWallboxOids exception ignored " + e);
        }

        if (totalChanged > 0) {
            setState({ native, changed: getIsChanged(native) });
        }
    }

    private static removeEntries(native: any): { native: any; removed: number } {
        if (native === undefined || native === null || typeof native !== 'object') {
            return { native, removed: 0 };
        }

        const keysToRemove = ["nonmae"];
        let removed = 0;

        for (const key of keysToRemove) {
            if (Object.prototype.hasOwnProperty.call(native, key)) {
                try {
                    // Lösche die Eigenschaft
                    delete native[key];
                    removed++;
                } catch (e) {
                    // Falls ein Löschen fehlschlägt, protokollieren, aber weitermachen
                    // Der Aufrufer kann dies weiter behandeln
                    // Vermeide Abbruch der Migration
                    // eslint-disable-next-line no-console
                    console.warn(`removeEntries: failed to delete property ${key}: ${e}`);
                }
            }
        }

        return { native, removed };
    }

    private static populateWallboxOids(native: any): { native: any; changed: number } {
        if (native === undefined || native === null || typeof native !== 'object') {
            console.warn("populateWallboxOids: native config is invalid");
            return { native, changed: 0 };
        }

        const devices = native.devices as SempDevice[];
        if (devices === undefined || devices === null || typeof devices !== 'object') {
            console.warn("populateWallboxOids: devices config is invalid");
            return { native, changed: 0 };
        }

        let changed = 0;

        for (let d = 0; d < devices.length; d++) {

            if (devices[d].Type !== 'EVCharger') {
                //keine wallbox
                console.log("Skipping non-EVCharger device during Wallbox OID migration: " + devices[d].Name);
                continue;
            }

            if (devices[d].wallbox_oid_read !== undefined && devices[d].wallbox_oid_write !== undefined && devices[d].wallbox_oid_write.length > 0 && devices[d].wallbox_oid_read.length > 0) {
                //already migrated
                console.log("Skipping already migrated Wallbox device: " + devices[d].Name);
                continue;
            }

            if (devices[d].WallboxOIDs === undefined || devices[d].WallboxOIDs === null || devices[d].WallboxOIDs.length == 0) {
                //no wallbox oids defined
                console.log("No Wallbox OIDs defined for device during migration: " + devices[d].Name);
                continue;
            }

            changed++;

            if (devices[d].wallbox_oid_read === undefined || devices[d].wallbox_oid_read === null) {
                devices[d].wallbox_oid_read = [];
            }

            if (devices[d].wallbox_oid_write === undefined || devices[d].wallbox_oid_write === null) {
                devices[d].wallbox_oid_write = [];
            }

            for (let w = 0; w < devices[d].WallboxOIDs.length; w++) {
                const oidSetting = devices[d].WallboxOIDs[w];

                if (oidSetting.Name == "DeviceOIDPlugConnected") {
                    devices[d].wallbox_oid_read.push(oidSetting);
                } else if (oidSetting.Name == "DeviceOIDIsCharging") {
                    devices[d].wallbox_oid_read.push(oidSetting);
                } else if (oidSetting.Name == "DeviceOIDIsError") {
                    devices[d].wallbox_oid_read.push(oidSetting);
                } else if (oidSetting.Name == "DeviceOIDCounter") {
                    devices[d].wallbox_oid_read.push(oidSetting);
                } else if (oidSetting.Name == "DeviceOIDStatus") {
                    devices[d].wallbox_oid_read.push(oidSetting);
                } else if (oidSetting.Name == "DeviceOIDChargePower") {
                    devices[d].wallbox_oid_write.push(oidSetting);
                } else if (oidSetting.Name == "DeviceOIDStartCharge") {
                    devices[d].wallbox_oid_write.push(oidSetting);
                } else if (oidSetting.Name == "DeviceOIDStopCharge") {
                    devices[d].wallbox_oid_write.push(oidSetting);
                } else if (oidSetting.Name == "DeviceOID3PhaseChargeEnable") {
                    devices[d].wallbox_oid_write.push(oidSetting);
                } else if (oidSetting.Name == "DeviceOID3PhaseChargeDisable") {
                    devices[d].wallbox_oid_write.push(oidSetting);
                } else if (oidSetting.Name == "DeviceOIDSwitch") {
                    devices[d].wallbox_oid_write.push(oidSetting);
                } else {
                    console.warn("Unknown Wallbox OID found during migration: " + oidSetting.Name);
                }
            }
        }

        native.devices = devices;

        console.log("Wallbox OID migration completed. Total devices updated: " + changed);

        return { native, changed };
    }
}