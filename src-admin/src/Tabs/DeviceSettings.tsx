/* eslint-disable prefer-template */
/* eslint-disable quote-props */
/* eslint-disable prettier/prettier */

/*
Pseudocode / Plan (detailliert):
1. Problem: mehrere TypeScript/JSX-Syntaxfehler und fehlende Handler/Props.
2. Ziel: Datei reparieren:
   - JSX korrekt schließen und Struktur vereinfachen (klarere ternäre Operatoren).
   - Fehlende Funktion `onChangeSettings` hinzufügen.
   - Kinderkomponenten die erwarteten Props (`socket`, `themeName`, `themeType`) übergeben.
   - Sicherstellen, dass Wallbox-Arrays initialisiert werden (bestehende Logik beibehalten).
   - Keine semantischen Änderungen außer den notwendigen Korrekturen.
3. Schritt-für-Schritt:
   - Behalte vorhandene Importe und Hilfsfunktionen.
   - Ergänze `onChangeSettings(field, value)`:
     - prüfe `device`, erstelle `updated = {...device, [field]: value}`, setze lokalen State und persistiere.
   - Baue `return`-JSX neu auf:
     - oberen Bereich (Select + Checkbox) rendern.
     - Falls kein Gerät ausgewählt -> Hinweis.
     - Falls Gerät ausgewählt und aktiv -> mehrere Sections rendern (mit übergebenen Props).
     - Falls Gerät ausgewählt und inaktiv -> Hinweis.
   - Übergib an alle Kinder `onChange={onChangeSettings}` sowie `socket`, `themeName`, `themeType`.
   - Stelle sicher, dass alle JSX-Tags korrekt geöffnet/geschlossen sind.
4. Ergebnis: Kompilierbare TSX-Datei mit behobenen TS-Fehlern und vollständigen Props/Handlern.
*/

import React, { useEffect, useState } from 'react';
import type { AdminConnection, IobTheme, ThemeName, ThemeType } from '@iobroker/adapter-react-v5';
import { I18n } from '@iobroker/adapter-react-v5';
import type { SempAdapterConfig, SempDevice } from "../types";

import {
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

import BoxDivider from '../Components/BoxDivider'
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

    console.log("DeviceSettings render: " + JSON.stringify(props.native));

    const [selectedDevice, setSelectedDevice] = useState<string>(() => (props.native as any).deviceSelector ?? ' ');

    const findDevice = (idOrName: string): SempDevice | undefined => {
        if (!idOrName) {
            return undefined;
        }
        const arr: SempDevice[] = (props.native as any).devices ?? [];
        return arr.find(r => r && (r.ID === idOrName || r.Name === idOrName));
    };

    // Vollständiges Device-Objekt für Bearbeitung
    const [device, setDevice] = useState<SempDevice | undefined>(() => findDevice((props.native as any).deviceSelector ?? ''));

    // Original-ID beim Laden, damit wir beim Persistieren das richtige Objekt finden
    const [editingDeviceOriginalId, setEditingDeviceOriginalId] = useState<string>(() => findDevice((props.native as any).deviceSelector ?? '')?.ID ?? '');

    // Wenn die prop-Config von außen geändert wird, lokalen State anpassen
    useEffect(() => {
        const external = (props.native as any).deviceSelector ?? '';
        if (external !== selectedDevice) {
            setSelectedDevice(external);
            const cur = findDevice(external);
            setDevice(cur);
            setEditingDeviceOriginalId(cur?.ID ?? '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.native.deviceSelector]);

    // Wenn die Auswahl über UI geändert wird
    const handleDeviceChange = (event: SelectChangeEvent<string>): void => {
        const value = event.target.value ?? '';
        setSelectedDevice(value);

        const cur = findDevice(value);
        setDevice(cur);
        setEditingDeviceOriginalId(cur?.ID ?? '');

        // Persistiere die Auswahl durch changeNative (deviceSelector = ID)
        const newNative = {
            ...(props.native as any),
            deviceSelector: value,
        } as SempAdapterConfig;

        props.changeNative(newNative as unknown as ioBroker.AdapterConfig);
    };

    // Persistiert ein gesamtes Device in props.native.devices
    const persistDevice = (newDevice: SempDevice | undefined): void => {
        if (!newDevice) return;
        const devices: SempDevice[] = (props.native as any).devices ?? [];
        const origId = editingDeviceOriginalId || newDevice.ID;
        const newDevices = devices.map(d => d && d.ID === origId ? { ...newDevice } : d);

        // Falls das Gerät nicht gefunden wurde (z. B. neue Liste), füge es hinzu
        if (!devices.find(d => d && d.ID === origId)) {
            newDevices.push(newDevice);
        }

        const newNative: any = {
            ...(props.native as any),
            devices: newDevices,
        };

        // Wenn die ID geändert wurde und deviceSelector zeigte auf origId, aktualisiere selector
        if ((props.native as any).deviceSelector === origId && newDevice.ID !== origId) {
            newNative.deviceSelector = newDevice.ID;
            setSelectedDevice(newDevice.ID);
            setEditingDeviceOriginalId(newDevice.ID);
        }

        props.changeNative(newNative as unknown as ioBroker.AdapterConfig);
        // Lokalen device-state aktualisieren
        setDevice(newDevice);
    };

    // Generische Handler (event-basiert für TextField)
    const handleStringChange = (field: keyof SempDevice) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value ?? '';
        const updated = { ...(device ?? {}), [field]: val } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Neuen Handler für SelectOID / Komponenten, die direkt einen string übergeben
    const handleStringChangeValue = (field: keyof SempDevice | string) => (value: string): void => {
        const val = value ?? '';
        const updated = { ...(device ?? {}), [field]: val } as unknown as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    const handleNumberChange = (field: keyof SempDevice) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const val = raw === '' ? '' : Number(raw);
        const updated = { ...(device ?? {}), [field]: val } as unknown as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // handleBoolChange akzeptiert nun auch string-Keys (historische/abweichende Keys)
    const handleBoolChange = (field: keyof SempDevice | string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = !!e.target.checked;
        const updated = { ...(device ?? {}), [field]: val } as unknown as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // isActive für das aktuell ausgewählten Gerät aus device
    const deviceIsActive = !!(device && (device as any).IsActive);

    // Checkbox-Handler für IsActive (spezialisiert, weil IsActive auch UI-Checkbox ist)
    const persistDeviceIsActive = (checked: boolean): void => {
        if (!device) return;
        const updated = { ...device, IsActive: !!checked } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // GENERISCHER onChange für untergeordnete Komponenten - BEWAHREN (field,value) für interne/nachfolgende Nutzung
    const onChangeSettings = (field: keyof SempDevice | string, value: any): void => {
        if (!device) return;
        const updated = { ...(device ?? {}), [field]: value } as unknown as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Neuer Wrapper, der dem Interface der Kinder entspricht: (value: string) => void
    const onChildChange = (value: string): void => {
        if (!value) return;
        try {
            const parsed = JSON.parse(value) as SempDevice;
            setDevice(parsed);
            persistDevice(parsed);
        } catch (e) {
            // falls value kein JSON ist, ignoriere oder logge
            // console.error('onChildChange: invalid JSON', e);
        }
    };

    return (
        <div style={{ width: 'calc(100% - 8px)', minHeight: '100%' }}>
            <div style={{ marginBottom: 12 }}>
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
                        {(props.native as any).devices?.map((r: SempDevice) => (
                            <MenuItem key={r.ID} value={r.ID}>
                                {r.Name}
                            </MenuItem>
                        )) ?? null}
                    </Select>
                </FormControl>
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
            </div>

            {selectedDevice ? (
                deviceIsActive ? (
                    <div>
                        <BoxDivider
                            Name={I18n.t('main settings')}
                            theme={props.theme}
                        />

                        <GeneralSettings
                            theme={props.theme}
                            socket={props.socket}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            device={device}
                            onChange={onChildChange}
                        />

                        <BoxDivider
                            Name={I18n.t('counter')}
                            theme={props.theme}
                        />

                        <CounterSettings
                            theme={props.theme}
                            socket={props.socket}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            device={device}
                            onChange={onChildChange}
                        />

                        <BoxDivider
                            Name={I18n.t('switch')}
                            theme={props.theme}
                        />

                        <SwitchSettings         
                            theme={props.theme}
                            socket={props.socket}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            device={device}
                            onChange={onChildChange}
                        />

                        {device && (device as any).DeviceTimerActive === true ? (
                            <EnergyRequestTimerSettings
                                theme={props.theme}
                                socket={props.socket}
                                themeName={props.themeName}
                                themeType={props.themeType}
                                device={device}
                                onChange={onChildChange}
                            />
                        ) : null}

                        {(device && (device as any).Type) === "EVCharger" ? (
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
        </div>
    );
}


