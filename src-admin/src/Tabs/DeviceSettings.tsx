/* eslint-disable prefer-template */
/* eslint-disable quote-props */
/* eslint-disable prettier/prettier */
import React, { useEffect, useState, useCallback } from 'react';
import type {
    AdminConnection,
    IobTheme,
    ThemeName,
    ThemeType
} from '@iobroker/adapter-react-v5';

import { I18n } from '@iobroker/adapter-react-v5';


import type { SempAdapterConfig, SempDevice } from "../types";

import {
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    FormControlLabel,
    IconButton,
    Box,
    TextField,
} from '@mui/material';

import type{ SelectChangeEvent } from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';

import GeneralSettings from '../Components/GeneralSettings';
import CounterSettings from '../Components/CounterSettings';
import SwitchSettings from '../Components/SwitchSettings';
import EnergyRequestTimerSettings from '../Components/EnergyRequestTimerSettings';
import WallboxSettings from '../Components/WallboxSettings';

interface SettingsProps {
    common: ioBroker.InstanceCommon;
    native: SempAdapterConfig;
    instance: number;
    adapterName: string;
    socket: AdminConnection;
    changeNative: (native: ioBroker.AdapterConfig) => void;
    themeName: ThemeName;
    themeType: ThemeType;
    theme: IobTheme;
    systemConfig: ioBroker.SystemConfigObject;
    rooms?: Record<string, ioBroker.EnumObject>;
    functions?: Record<string, ioBroker.EnumObject>;
    alive: boolean;
}

export default function DeviceSettings(props: SettingsProps): React.JSX.Element {

    console.log("DeviceSettings render ");

    const [selectedDevice, setSelectedDevice] = useState<string>(() => props.native.deviceSelector ?? ' ');

    // findDevice als stable Callback, Abhängigkeit: props.native (die devices darin)
    const findDevice = useCallback((idOrName: string): SempDevice | undefined => {
        if (!idOrName) {
            return undefined;
        }
        const arr: SempDevice[] = props.native.devices ?? [];
        return arr.find(r => r && (r.ID === idOrName || r.Name === idOrName));
    }, [props.native]);

    // Vollständiges Device-Objekt für Bearbeitung
    const [device, setDevice] = useState<SempDevice | undefined>(() => findDevice(props.native.deviceSelector ?? ''));

    // Original-ID beim Laden, damit wir beim Persistieren das richtige Objekt finden
    const [editingDeviceOriginalId, setEditingDeviceOriginalId] = useState<string>(() => findDevice(props.native.deviceSelector ?? '')?.ID ?? '');

    // Wenn die prop-Config von außen geändert wird, lokalen State anpassen
    useEffect(() => {
        const external = props.native.deviceSelector ?? '';
        if (external !== selectedDevice) {
            setSelectedDevice(external);
            const cur = findDevice(external);
            setDevice(cur);
            setEditingDeviceOriginalId(cur?.ID ?? '');
        }
    }, [props.native, findDevice, selectedDevice]);

    // Wenn die Auswahl über UI geändert wird
    const handleDeviceChange = (event: SelectChangeEvent<string>): void => {
        const value = event.target.value ?? '';
        setSelectedDevice(value);

        const cur = findDevice(value);
        setDevice(cur);
        setEditingDeviceOriginalId(cur?.ID ?? '');

        // Persistiere die Auswahl durch changeNative (deviceSelector = ID)
        const newNative: any = {
            ...(props.native),
            deviceSelector: value,
        };

        props.changeNative(newNative);
    };

    // Persistiert ein gesamtes Device in props.native.devices
    const persistDevice = (newDevice: SempDevice | undefined): void => {
        if (!newDevice) {
            return;
        }
        const devices: SempDevice[] = props.native.devices ?? [];
        const origId = editingDeviceOriginalId || newDevice.ID;
        const newDevices = devices.map(d => d && d.ID === origId ? { ...newDevice } : d);

        // Falls das Gerät nicht gefunden wurde (z. B. neue Liste), füge es hinzu
        if (!devices.find(d => d && d.ID === origId)) {
            newDevices.push(newDevice);
        }

        const newNative: SempAdapterConfig = {
            ...(props.native),
            devices: newDevices,
        };

        // Wenn die ID geändert wurde und deviceSelector zeigte auf origId, aktualisiere selector
        if (props.native.deviceSelector === origId && newDevice.ID !== origId) {
            newNative.deviceSelector = newDevice.ID;
            setSelectedDevice(newDevice.ID);
            setEditingDeviceOriginalId(newDevice.ID);
        }

        props.changeNative(newNative);
        // Lokalen device-state aktualisieren
        setDevice(newDevice);
    };

    // isActive für das aktuell ausgewählten Gerät aus device
    const deviceIsActive = !!(device && device.IsActive);

    // Checkbox-Handler für IsActive (spezialisiert, weil IsActive auch UI-Checkbox ist)
    const persistDeviceIsActive = (checked: boolean): void => {
        if (!device) {
            return;
        }
        const updated = { ...device, IsActive: !!checked } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Neuer Wrapper, der dem Interface der Kinder entspricht: (value: string) => void
    const onChildChange = (value: string): void => {
        if (!value) {
            return;
        }
        try {
            const parsed = JSON.parse(value) as SempDevice;

            console.log("onChildChange parsed value: ", parsed);

            setDevice(parsed);
            persistDevice(parsed);
        } catch (e) {
            // falls value kein JSON ist, ignoriere oder logge
            console.error("Failed to parse child change value:", e);
        }
    };

    // Handler zum Erstellen eines neuen Devices mit Standardwerten
    const createNewDevice = (): void => {
        const devices: SempDevice[] = props.native.devices ?? [];
        const count = devices.length + 1;

        // Anzahl der Devices als String, auf 12 Zeichen mit führenden Nullen auffüllen
        const paddedCount = String(count).padStart(12, '0');

        // DeviceBaseID aus Konfiguration (sicherstellen, dass es ein String ist)
        const baseId = String(props.native.DeviceBaseID ?? '');

        // Neue ID nach Schema: "F-" + BaseID + paddedCount + "-00"
        const newId = 'F-' + baseId + "-"+ paddedCount + '-00';

        const newName = I18n.t("new device")  + " " + String(count);
        // Cast to SempDevice, damit TypeScript nicht über fehlende optionale Felder meckert
        const newDevice = {
            ID: newId,
            Name: newName,
            IsActive: true,
            Type: '',
            MeasurementMethod: "Measurement",
            StatusDetectionType: "SeparateOID",
            MeasurementUnit: "W",
        } as SempDevice;

        const newDevices = [...devices, newDevice];
        const newNative: SempAdapterConfig = {
            ...(props.native),
            devices: newDevices,
            deviceSelector: newId,
        };

        props.changeNative(newNative);

        // Lokaler State sofort aktualisieren damit UI reaktiv ist
        setSelectedDevice(newId);
        setDevice(newDevice);
        setEditingDeviceOriginalId(newId);
    };

    // Hilfsfunktion: wert eines string-feldes aus device anzeigen
    type KeysOfType<T, ValueType> = {
        [K in keyof T]: T[K] extends ValueType ? K : never
    }[keyof T];

    type StringKeys = KeysOfType<SempDevice, string | undefined>;
    const valString = (field: StringKeys): string => {
        if (!device) {
            return '';
        }
        const v = device[field];

        return v ?? '';
    };
    /*
    const valString = (key: string): string => {
        if (!props.native) {
            return '';
        }
        const v = (props.native)[key];
        return v === undefined || v === null ? '' : String(v);
    };
    */

    // Handler: Änderung des DeviceBaseID-Feldes
    const handleBaseIdChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        if (!props.native) {
            return;
        }
        const newVal = e.target.value ?? '';
        const updated: any = { ...(props.native), DeviceBaseID: newVal };

        // Direkt persistieren
        props.changeNative(updated);
    };

    // Handler: Generiere eine DeviceBaseID basierend auf Name oder ID (gesäubert)
    const handleGenerateBaseId = async (): Promise<void> => {
        if (!props.native) {
            return;
        }

        try {
            const newBaseID = (await props.socket.sendTo(props.adapterName + "." + props.instance, 'getDeviceBaseID'));
            const updated: any = { ...(props.native), DeviceBaseID: newBaseID ?? '' };

            // Direkt persistieren
            props.changeNative(updated);
        } catch (err) {
            console.error("Failed to generate base id:", err);
        }
    };

    return (
        <Box style={{ width: 'calc(100% - 8px)', minHeight: '100%' }}>
            <Box
                style={{ margin: 10 }}
            >
                <FormControl variant="standard" sx={{ minWidth: '40%', maxWidth: '60%' }} >
                    <InputLabel id="device-selector-label">{I18n.t('select a device')}</InputLabel>
                    <Select
                        labelId="device-selector-label"
                        value={selectedDevice ?? ' '}
                        onChange={handleDeviceChange}
                        displayEmpty
                    >
                        <MenuItem value=" ">
                            <em>{I18n.t('no device selected')}</em>
                        </MenuItem>
                        {props.native.devices?.map((r: SempDevice) => (
                            <MenuItem key={r.ID} value={r.ID}>
                                {r.Name}
                            </MenuItem>
                        )) ?? null}
                    </Select>
                </FormControl>

                {/* IconButton zum Anlegen eines neuen Devices */}
                <IconButton
                    color="primary"
                    onClick={createNewDevice}
                    sx={{ marginLeft: 2, marginTop: '6px' }}
                    aria-label={I18n.t('add device')}
                >
                    <AddIcon />
                </IconButton>




                {/* Checkbox für isActive des aktuell ausgewählten Geräts */}
                {selectedDevice ? (
                    <FormControlLabel
                        control={
                            <Checkbox
                                color="primary"
                                checked={deviceIsActive}
                                onChange={(e) => persistDeviceIsActive((e.target as HTMLInputElement).checked)}
                                aria-label="device active checkbox"
                            />
                        }
                        label={I18n.t('active')}
                    />
                ) : null}
            </Box>

            <Box
                style={{ margin: 10 }}
            >
                <TextField
                    id='DeviceBaseID'
                    label={I18n.t('DeviceBaseID')}
                    variant="standard"
                    value={valString('DeviceBaseID')}
                    onChange={handleBaseIdChange}
                    sx={{ minWidth: '30%', maxWidth: '50%', marginRight: '10px' }}
                />

                <IconButton
                    color="secondary"
                    onClick={handleGenerateBaseId}
                    sx={{ marginTop: '6px' }}
                    aria-label={I18n.t('generateBaseId')}
                >
                    <AutorenewIcon />
                </IconButton>

            </Box>



            {selectedDevice ? (
                deviceIsActive ? (
                    <div>


                        <GeneralSettings
                            theme={props.theme}
                            socket={props.socket}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            device={device}
                            onChange={onChildChange}
                        />


                        <CounterSettings
                            theme={props.theme}
                            socket={props.socket}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            device={device}
                            onChange={onChildChange}
                        />


                        <SwitchSettings
                            theme={props.theme}
                            socket={props.socket}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            device={device}
                            onChange={onChildChange}
                        />


                        <EnergyRequestTimerSettings
                            theme={props.theme}
                            socket={props.socket}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            device={device}
                            onChange={onChildChange}
                        />


                        {(device && device.Type) === "EVCharger" ? (
                            <WallboxSettings
                                theme={props.theme}
                                socket={props.socket}
                                themeName={props.themeName}
                                themeType={props.themeType}
                                device={device}
                                onChange={onChildChange}
                            />
                        ) : null}
                    </div>
                ) : (
                    <div>
                        <em>{I18n.t('device is inactive - activate to edit settings')}</em>
                    </div>
                )
            ) : (
                <div>
                    <em>{I18n.t('select a device to display settings')}</em>
                </div>
            )}
        </Box>
    );
}


