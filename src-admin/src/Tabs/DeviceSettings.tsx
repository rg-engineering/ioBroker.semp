/* eslint-disable prefer-template */
/* eslint-disable quote-props */
/* eslint-disable prettier/prettier */

import React, { useEffect, useMemo, useState } from 'react';
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
    Button,
    Badge,
    Box,
    TextField,
    Tooltip,
    IconButton,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import BoxDivider from '../Components/BoxDivider'
import SelectOID from '../Components/SelectOID';


/*
PSEUDOCODE / PLAN (detailliert):
- Behalte bisherigen Component-Aufbau.
- Probleme beheben:
  - SelectOID verlangt onChange(value: string). Füge handleStringChangeValue hinzu, das direkt einen string akzeptiert.
  - Bestehende handleStringChange behalte für <TextField> (event-basiert).
  - handleBoolChange so erweitern, dass auch Keys außerhalb von keyof SempDevice akzeptiert werden (z.B. historische/freie Keys).
  - Falsch geschriebene Komponente <CheckBox> zu <Checkbox> korrigieren.
  - SelectOID-Callbacks im Wallbox-Teil so anpassen, dass sie den übergebenen string verwenden (nicht e.target.value).
  - Entferne/deaktiviere problematische/deprecated inputProps / InputProps Verwendungen (min/max). Entferne sie, um TS-Fehler zu vermeiden; behalte type="number".
- Zusätzliche kleine Typ-Anpassungen: casts mit "as any" nur dort, wo notwendig.
- Danach Komponente kompilierbar machen ohne die UI-Logik zu verändern.
*/

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

    const [selectedDevice, setSelectedDevice] = useState<string>(() => (props.native as any).deviceSelector ?? '');

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
    }, [props.native.deviceSelector]); // eslint-disable-line react-hooks/exhaustive-deps

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
        // device als any behandeln, da field evtl. nicht im Typ enthalten ist
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

    // Kurzer Helfer für sichere Felderausgabe
    const valString = (field: keyof SempDevice) => (device && (device as any)[field] !== undefined ? String((device as any)[field]) : '');
    const valNumber = (field: keyof SempDevice) => (device && (device as any)[field] !== undefined ? (device as any)[field] : '');

    // isActive für das aktuell ausgewählten Gerät aus device
    const deviceIsActive = !!(device && (device as any).IsActive);

    // Checkbox-Handler für IsActive (spezialisiert, weil IsActive auch UI-Checkbox ist)
    const persistDeviceIsActive = (checked: boolean): void => {
        if (!device) return;
        const updated = { ...device, IsActive: !!checked } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // EnergyRequests helpers & table handlers
    const settings = device?.EnergyRequests ?? [];
    const colCount = 7;
    const addButtonTooltip: string | undefined = undefined;

    const onAdd = (): void => {
        if (!device) return;
        const reqs = Array.isArray(device.EnergyRequests) ? [...device.EnergyRequests] : [];
        const newReq = {
            ID: `req_${Date.now()}`,
            Days: '',
            EarliestStartTime: '',
            LatestEndTime: '',
            MinRunTime: 0,
            MaxRunTime: 0
        } as any;
        reqs.push(newReq);
        const updated = { ...device, EnergyRequests: reqs } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    const onUpdate = (idx: number, key: string, value: any): void => {
        if (!device) return;
        const reqs = [...(device.EnergyRequests ?? [])];
        reqs[idx] = { ...(reqs[idx] ?? {}), [key]: value };
        const updated = { ...device, EnergyRequests: reqs } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    const onRemove = (idx: number): void => {
        if (!device) return;
        const reqs = [...(device.EnergyRequests ?? [])];
        if (idx >= 0 && idx < reqs.length) {
            reqs.splice(idx, 1);
            const updated = { ...device, EnergyRequests: reqs } as SempDevice;
            setDevice(updated);
            persistDevice(updated);
        }
    };

    // Wallbox handlers (write)
    const onWallboxWriteUpdate = (idx: number, key: string, value: any): void => {
        if (!device) return;
        const arr = [...((device as any).wallbox_oid_write ?? [])];
        arr[idx] = { ...(arr[idx] ?? {}), [key]: value };
        const updated = { ...device, ...({ wallbox_oid_write: arr } as any) } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Wallbox handlers (read)
    const onWallboxReadUpdate = (idx: number, key: string, value: any): void => {
        if (!device) return;
        const arr = [...((device as any).wallbox_oid_read ?? [])];
        arr[idx] = { ...(arr[idx] ?? {}), [key]: value };
        const updated = { ...device, ...({ wallbox_oid_read: arr } as any) } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Toggle active for wallbox items (write)
    const onWallboxWriteToggleActive = (idx: number, checked: boolean): void => {
        onWallboxWriteUpdate(idx, 'active', !!checked);
    };

    // Toggle active for wallbox items (read)
    const onWallboxReadToggleActive = (idx: number, checked: boolean): void => {
        onWallboxReadUpdate(idx, 'active', !!checked);
    };

    return (
        <div style={{ width: 'calc(100% - 8px)', minHeight: '100%' }}>
            <div style={{ marginBottom: 12 }}>
                <FormControl variant="standard" sx={{ minWidth: '40%', maxWidth: '60%' }} >
                    <InputLabel id="device-selector-label">{I18n.t('select a device')}</InputLabel>
                    <Select
                        labelId="device-selector-label"
                        value={selectedDevice ?? ''}
                        onChange={handleDeviceChange}
                        displayEmpty
                    >
                        <MenuItem value="">
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
                    <FormControl fullWidth variant="standard">

                        <BoxDivider
                            Name={I18n.t('main settings')}
                            theme={props.theme}
                        />

                        <TextField
                            style={{ marginBottom: 16 }}
                            id='DeviceID'
                            label={I18n.t('DeviceID')}
                            variant="standard"
                            value={valString('ID')}
                            onChange={(e) => {
                                // Beim ID-Ändern müssen wir editingDeviceOriginalId beachten
                                const newId = e.target.value ?? '';
                                const updated = { ...(device ?? {}), ID: newId } as SempDevice;
                                setDevice(updated);
                                persistDevice(updated);
                            }}
                        />

                        <TextField
                            style={{ marginBottom: 16 }}
                            id='DeviceName'
                            label={I18n.t('DeviceName')}
                            variant="standard"
                            value={valString('Name')}
                            onChange={handleStringChange('Name')}
                        />

                        <TextField
                            style={{ marginBottom: 16 }}
                            id='DeviceVendor'
                            label={I18n.t('DeviceVendor')}
                            variant="standard"
                            value={valString('Vendor')}
                            onChange={handleStringChange('Vendor')}
                        />

                        <TextField
                            style={{ marginBottom: 16 }}
                            id='DeviceSerialnumber'
                            label={I18n.t('DeviceSerialnumber')}
                            variant="standard"
                            value={valString('Serialnumber')}
                            onChange={handleStringChange('Serialnumber')}
                        />

                        <InputLabel id="device-type-label">{I18n.t('select a type')}</InputLabel>
                        <Select
                            labelId="device-type-label"
                            value={valString('Type') ?? ''}
                            onChange={(e) => {
                                const val = e.target.value ?? '';
                                const updated = { ...(device ?? {}), Type: val } as SempDevice;
                                setDevice(updated);
                                persistDevice(updated);
                            }}
                            displayEmpty
                        >
                            <MenuItem value="AirConditioning">
                                <em>{I18n.t('AirConditioning')}</em>
                            </MenuItem>
                            <MenuItem value="Charger">
                                <em>{I18n.t('Charger')}</em>
                            </MenuItem>
                            <MenuItem value="DishWasher">
                                <em>{I18n.t('DishWasher')}</em>
                            </MenuItem>
                            <MenuItem value="Dryer">
                                <em>{I18n.t('Dryer')}</em>
                            </MenuItem>
                            <MenuItem value="ElectricVehicle">
                                <em>{I18n.t('ElectricVehicle')}</em>
                            </MenuItem>
                            <MenuItem value="EVCharger">
                                <em>{I18n.t('EVCharger')}</em>
                            </MenuItem>
                            <MenuItem value="Freezer">
                                <em>{I18n.t('Freezer')}</em>
                            </MenuItem>
                            <MenuItem value="Fridge">
                                <em>{I18n.t('Fridge')}</em>
                            </MenuItem>
                            <MenuItem value="Heater">
                                <em>{I18n.t('Heater')}</em>
                            </MenuItem>
                            <MenuItem value="HeatPump">
                                <em>{I18n.t('HeatPump')}</em>
                            </MenuItem>
                            <MenuItem value="Motor">
                                <em>{I18n.t('Motor')}</em>
                            </MenuItem>
                            <MenuItem value="Pump">
                                <em>{I18n.t('Pump')}</em>
                            </MenuItem>
                            <MenuItem value="WashingMachine">
                                <em>{I18n.t('WashingMachine')}</em>
                            </MenuItem>
                            <MenuItem value="Other">
                                <em>{I18n.t('Other')}</em>
                            </MenuItem>
                        </Select>

                        <TextField
                            style={{ marginBottom: 16 }}
                            id='DeviceMinPower'
                            label={I18n.t('DeviceMinPower (W)')}
                            variant="standard"
                            type="number"
                            value={valNumber('MinPower')}
                            onChange={handleNumberChange('MinPower')}
                        />

                        <TextField
                            style={{ marginBottom: 16 }}
                            id='DeviceMaxPower'
                            label={I18n.t('DeviceMaxPower (W)')}
                            variant="standard"
                            type="number"
                            value={valNumber('MaxPower')}
                            onChange={handleNumberChange('MaxPower')}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    color="primary"
                                    checked={!!(device && (device as any).InterruptionAllowed)}
                                    onChange={handleBoolChange('InterruptionAllowed')}
                                    aria-label="device Interruption Allowed"
                                />
                            }
                            label={I18n.t('Interruption Allowed')}
                        />

                        {(device && (device as any).InterruptionAllowed) === true ? (
                            <div>
                                <TextField
                                    style={{ marginBottom: 16 }}
                                    id='DeviceMinOnTime'
                                    label={I18n.t('DeviceMinOnTime')}
                                    variant="standard"
                                    type="number"
                                    value={valNumber('MinOnTime')}
                                    onChange={handleNumberChange('MinOnTime')}
                                />
                                <TextField
                                    style={{ marginBottom: 16 }}
                                    id='DeviceMaxOnTime'
                                    label={I18n.t('DeviceMaxOnTime')}
                                    variant="standard"
                                    type="number"
                                    value={valNumber('MaxOnTime')}
                                    onChange={handleNumberChange('MaxOnTime')}
                                />
                                <TextField
                                    style={{ marginBottom: 16 }}
                                    id='DeviceMinOffTime'
                                    label={I18n.t('DeviceMinOffTime')}
                                    variant="standard"
                                    type="number"
                                    value={valNumber('MinOffTime')}
                                    onChange={handleNumberChange('MinOffTime')}
                                />
                                <TextField
                                    style={{ marginBottom: 16 }}
                                    id='DeviceMaxOffTime'
                                    label={I18n.t('DeviceMaxOffTime')}
                                    variant="standard"
                                    type="number"
                                    value={valNumber('MaxOffTime')}
                                    onChange={handleNumberChange('MaxOffTime')}
                                />
                            </div>
                        ) : null}

                        <BoxDivider
                            Name={I18n.t('counter')}
                            theme={props.theme}
                        />

                        <InputLabel id="device-MeasurementMethod-label">{I18n.t('select a type')}</InputLabel>
                        <Select
                            labelId="device-MeasurementMethod-label"
                            value={valString('MeasurementMethod') || 'Measurement'}
                            onChange={(e) => {
                                const val = e.target.value ?? '';
                                const updated = { ...(device ?? {}), MeasurementMethod: val } as SempDevice;
                                setDevice(updated);
                                persistDevice(updated);
                            }}
                            displayEmpty={false}
                        >
                            <MenuItem value="Measurement">
                                <em>{I18n.t('Measurement')}</em>
                            </MenuItem>
                            <MenuItem value="Estimation">
                                <em>{I18n.t('Estimation')}</em>
                            </MenuItem>
                        </Select>

                        <SelectOID
                            settingName={I18n.t('DeviceOIDPower')}
                            socket={props.socket}
                            theme={props.theme}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            Value={valString('OIDPower') }
                            onChange={handleStringChangeValue('OIDPower')}
                        />



                        <InputLabel id="device-MeasurementUnit-label">{I18n.t('select a unit')}</InputLabel>
                        <Select
                            labelId="device-MeasurementUnit-label"
                            value={valString('MeasurementUnit') || 'W'}
                            onChange={(e) => {
                                const val = e.target.value ?? '';
                                const updated = { ...(device ?? {}), MeasurementUnit: val } as SempDevice;
                                setDevice(updated);
                                persistDevice(updated);
                            }}
                            displayEmpty={false}
                        >
                            <MenuItem value="W">
                                <em>{I18n.t('W')}</em>
                            </MenuItem>
                            <MenuItem value="kW">
                                <em>{I18n.t('kW')}</em>
                            </MenuItem>
                        </Select>

                        <BoxDivider
                            Name={I18n.t('switch')}
                            theme={props.theme}
                        />

                        <InputLabel id="device-StatusDetectionType-label">{I18n.t('select a type')}</InputLabel>
                        <Select
                            labelId="device-StatusDetectionType-label"
                            value={valString('StatusDetectionType') || 'SeparateOID'}
                            onChange={(e) => {
                                const val = e.target.value ?? '';
                                const updated = { ...(device ?? {}), StatusDetectionType: val } as SempDevice;
                                setDevice(updated);
                                persistDevice(updated);
                            }}
                            displayEmpty={false}
                        >
                            <MenuItem value="SeparateOID">
                                <em>{I18n.t('SeparateOID')}</em>
                            </MenuItem>
                            <MenuItem value="FromPowerValue">
                                <em>{I18n.t('FromPowerValue')}</em>
                            </MenuItem>
                            <MenuItem value="AlwaysOn">
                                <em>{I18n.t('AlwaysOn')}</em>
                            </MenuItem>
                        </Select>



                        <SelectOID
                            settingName={I18n.t('DeviceOIDStatus')}
                            socket={props.socket}
                            theme={props.theme}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            Value={valString('OIDStatus')}
                            onChange={handleStringChangeValue('OIDStatus')}
                        />



                        <div>
                            <TextField
                                style={{ marginBottom: 16 }}
                                id='DeviceStatusDetectionLimit'
                                label={I18n.t('DeviceStatusDetectionLimit')}
                                variant="standard"
                                type="number"
                                value={valNumber('StatusDetectionLimit')}
                                onChange={handleNumberChange('StatusDetectionLimit')}
                            />

                            <TextField
                                style={{ marginBottom: 16 }}
                                id='DeviceStatusDetectionLimitTimeOn'
                                label={I18n.t('DeviceStatusDetectionLimitTimeOn')}
                                variant="standard"
                                type="number"
                                value={valNumber('StatusDetectionLimitTimeOn')}
                                onChange={handleNumberChange('StatusDetectionLimitTimeOn')}
                            />

                            <TextField
                                style={{ marginBottom: 16 }}
                                id='DeviceStatusDetectionLimitTimeOff'
                                label={I18n.t('DeviceStatusDetectionLimitTimeOff')}
                                variant="standard"
                                type="number"
                                value={valNumber('StatusDetectionLimitTimeOff')}
                                onChange={handleNumberChange('StatusDetectionLimitTimeOff')}
                            />
                            <TextField
                                style={{ marginBottom: 16 }}
                                id='DeviceStatusDetectionMinRunTime'
                                label={I18n.t('DeviceStatusDetectionMinRunTime')}
                                variant="standard"
                                type="number"
                                value={valNumber('StatusDetectionMinRunTime')}
                                onChange={handleNumberChange('StatusDetectionMinRunTime')}
                            />
                        </div>

                        <FormControlLabel
                            control={
                                <Checkbox
                                    color="primary"
                                    checked={!!(device && (device as any).HasOIDSwitch)}
                                    onChange={handleBoolChange('HasOIDSwitch')}
                                    aria-label="device has OID switch"
                                />
                            }
                            label={I18n.t('Has OID Switch')}
                        />


                        <SelectOID
                            settingName={I18n.t('DeviceOIDSwitch')}
                            socket={props.socket}
                            theme={props.theme}
                            themeName={props.themeName}
                            themeType={props.themeType}
                            Value={valString('OIDSwitch')}
                            onChange={handleStringChangeValue('OIDSwitch')}
                        />


                        <BoxDivider
                            Name={I18n.t('energy requests')}
                            theme={props.theme}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    color="primary"
                                    checked={!!(device && (device as any).DeviceTimerActive)}
                                    onChange={handleBoolChange('DeviceTimerActive')}
                                    aria-label="energy request timer active"
                                />
                            }
                            label={I18n.t('energy request timer active')}
                        />

                        {device && (device as any).DeviceTimerActive === true ? (
                            <div>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            color="primary"
                                            checked={!!(device && (device as any).DeviceTimerCancelIfNotOn)}
                                            onChange={handleBoolChange('DeviceTimerCancelIfNotOn')}
                                            aria-label="DeviceTimerCancelIfNotOn"
                                        />
                                    }
                                label={I18n.t('DeviceTimerCancelIfNotOn')}
                                />
                                <TextField
                                    style={{ marginBottom: 16 }}
                                    id='DeviceTimerCancelIfNotOnTime'
                                    label={I18n.t('DeviceTimerCancelIfNotOnTime')}
                                    variant="standard"
                                    type="number"
                                    value={valNumber('TimerCancelIfNotOnTime')}
                                    onChange={handleNumberChange('TimerCancelIfNotOnTime')}
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            color="primary"
                                            checked={!!(device && (device as any).DishwasherMode)}
                                            onChange={handleBoolChange('DishwasherMode')}
                                            aria-label="DishwasherMode"
                                        />
                                    }
                                label={I18n.t('DishwasherMode')}
                                />

                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <div style={{ fontWeight: 500 }}>{I18n.t('energy requests')}:</div>
                                        <Tooltip title={addButtonTooltip ?? I18n.t('add new request')}>
                                            <IconButton size="small" onClick={onAdd}>
                                                <AddIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </div>

                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>{I18n.t('ID')}</TableCell>
                                                <TableCell>{I18n.t('Days')}</TableCell>
                                                <TableCell>{I18n.t('EarliestStartTime')}</TableCell>
                                                <TableCell>{I18n.t('LatestEndTime')}</TableCell>
                                                <TableCell>{I18n.t('MinRunTime')}</TableCell>
                                                <TableCell>{I18n.t('MaxRunTime')}</TableCell>
                                                <TableCell>{I18n.t('Actions')}</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {settings.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={colCount} style={{ fontStyle: 'italic' }}>{I18n.t('nothing configured')}</TableCell>
                                                </TableRow>
                                            ) : settings.map((t: any, idx: number) => (
                                                <TableRow key={idx}>
                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            value={t.ID}
                                                            onChange={(e) => onUpdate(idx, 'ID', e.target.value)}
                                                            variant="standard"
                                                            placeholder={I18n.t('ID')}
                                                        />
                                                    </TableCell>

                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            value={t.Days}
                                                            onChange={(e) => onUpdate(idx, 'Days', e.target.value)}
                                                            variant="standard"
                                                            placeholder={I18n.t('Days')}
                                                        />
                                                    </TableCell>

                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            value={t.EarliestStartTime}
                                                            onChange={(e) => onUpdate(idx, 'EarliestStartTime', e.target.value)}
                                                            variant="standard"
                                                            placeholder={I18n.t('EarliestStartTime')}
                                                        />
                                                    </TableCell>

                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            value={t.LatestEndTime}
                                                            onChange={(e) => onUpdate(idx, 'LatestEndTime', e.target.value)}
                                                            variant="standard"
                                                            placeholder={I18n.t('LatestEndTime')}
                                                        />
                                                    </TableCell>

                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            value={t.MinRunTime}
                                                            onChange={(e) => onUpdate(idx, 'MinRunTime', e.target.value)}
                                                            variant="standard"
                                                            placeholder={I18n.t('MinRunTime')}
                                                            type="number"
                                                        />
                                                    </TableCell>

                                                    <TableCell>
                                                        <TextField
                                                            fullWidth
                                                            value={t.MaxRunTime}
                                                            onChange={(e) => onUpdate(idx, 'MaxRunTime', e.target.value)}
                                                            variant="standard"
                                                            placeholder={I18n.t('MaxRunTime')}
                                                            type="number"
                                                            />
                                                    </TableCell>

                                                    <TableCell>
                                                        <Tooltip title={I18n.t('Delete device')}>
                                                            <IconButton size="small" onClick={() => onRemove(idx)}>
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                            </div>

                        ): null
                        }


                        <BoxDivider
                            Name={I18n.t('wallbox')}
                            theme={props.theme}
                        />

                        <TextField
                            style={{ marginBottom: 16 }}
                            id='DeviceBatteryCapacity'
                            label={I18n.t('DeviceBatteryCapacity')}
                            variant="standard"
                            type="number"
                            value={valNumber('BatteryCapacity')}
                            onChange={handleNumberChange('BatteryCapacity')}
                        />


                        <InputLabel id="device-WallboxChargeTime-label">{I18n.t('select a charge time')}</InputLabel>
                        <Select
                            labelId="device-WallboxChargeTime-label"
                            value={valString('WallboxChargeTime') || '1'}
                            onChange={(e) => {
                                const val = e.target.value ?? '';
                                const updated = { ...(device ?? {}), WallboxChargeTime: val } as SempDevice;
                                setDevice(updated);
                                persistDevice(updated);
                            }}
                            displayEmpty={false}
                        >
                            <MenuItem value="1">
                                <em>{I18n.t('12h')}</em>
                            </MenuItem>
                            <MenuItem value="2">
                                <em>{I18n.t('24h')}</em>
                            </MenuItem>
                            <MenuItem value="3">
                                <em>{I18n.t('endless')}</em>
                            </MenuItem>
                            <MenuItem value="4">
                                <em>{I18n.t('user defined')}</em>
                            </MenuItem>
                        </Select>

                        <InputLabel id="device-WallboxPhases-label">{I18n.t('select a number of phases')}</InputLabel>
                        <Select
                            labelId="device-WallboxPhases-label"
                            value={valString('WallboxPhases') || '1'}
                            onChange={(e) => {
                                const val = e.target.value ?? '';
                                const updated = { ...(device ?? {}), WallboxPhases: val } as SempDevice;
                                setDevice(updated);
                                persistDevice(updated);
                            }}
                            displayEmpty={false}
                        >
                            <MenuItem value="1">
                                <em>{I18n.t('1Phase (230V)')}</em>
                            </MenuItem>
                            <MenuItem value="2">
                                <em>{I18n.t('3Phase (400)')}</em>
                            </MenuItem>
                            <MenuItem value="3">
                                <em>{I18n.t('1 or 3 Phase Switchable')}</em>
                            </MenuItem>
                            
                        </Select>

                        {valString('WallboxPhases') === '3' ? ( 
                            <div>
                        <TextField
                            style={{ marginBottom: 16 }}
                            id='Wallbox3phaseSwitchLimit'
                            label={I18n.t('Wallbox3phaseSwitchLimit')}
                            variant="standard"
                            type="number"
                            value={valNumber('Wallbox3phaseSwitchLimit')}
                            onChange={handleNumberChange('Wallbox3phaseSwitchLimit')}
                        />

                        <TextField
                            style={{ marginBottom: 16 }}
                            id='Wallbox3phaseSwitchDelay'
                            label={I18n.t('Wallbox3phaseSwitchDelay')}
                            variant="standard"
                            type="number"
                            value={valNumber('Wallbox3phaseSwitchDelay')}
                            onChange={handleNumberChange('Wallbox3phaseSwitchDelay')}
                                />
                            </div>
                        ) : null}

                        <FormControlLabel
                            control={
                                <Checkbox
                                    color="primary"
                                    checked={!!(device && (device as any).WallboxNeedCurrentRecommendation)}
                                    onChange={handleBoolChange('WallboxNeedCurrentRecommendation')}
                                    aria-label="WallboxNeedCurrentRecommendation"
                                />
                            }
                            label={I18n.t('WallboxNeedCurrentRecommendation')}
                        />


                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{I18n.t('active')}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>{I18n.t('Name')}</TableCell>
                                    <TableCell>{I18n.t('OID/URL')}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>{I18n.t('Type')}</TableCell>
                                    <TableCell>{I18n.t('SetValue')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {((device as any).wallbox_oid_write ?? []).map((t: any, idx: number) => (
                                    <TableRow key={idx}>
                                        <TableCell>
                                            <Checkbox
                                                checked={!!t.active}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onWallboxWriteToggleActive(idx, (e.target as HTMLInputElement).checked)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                value={t.must}
                                                onChange={(e) => onWallboxWriteUpdate(idx, 'must', e.target.value)}
                                                variant="standard"
                                                placeholder={I18n.t('ID')}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                value={t.Name}
                                                onChange={(e) => onWallboxWriteUpdate(idx, 'Name', e.target.value)}
                                                variant="standard"
                                                placeholder={I18n.t('Name')}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <SelectOID
                                                settingName={I18n.t('OID')}
                                                socket={props.socket}
                                                theme={props.theme}
                                                themeName={props.themeName}
                                                themeType={props.themeType}
                                                Value={t.OID}
                                                onChange={(value: string) => onWallboxWriteUpdate(idx, 'OID', value)}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            
                                        </TableCell>

                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                value={t.Type}
                                                onChange={(e) => onWallboxWriteUpdate(idx, 'Type', e.target.value)}
                                                variant="standard"
                                                placeholder={I18n.t('Type')}
                                                
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                value={t.SetValue}
                                                onChange={(e) => onWallboxWriteUpdate(idx, 'SetValue', e.target.value)}
                                                variant="standard"
                                                placeholder={I18n.t('SetValue')}
                                                
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        <TextField
                            style={{ marginBottom: 16 }}
                            id='URLReadPollRate'
                            label={I18n.t('URLReadPollRate')}
                            variant="standard"
                            type="number"
                            value={valNumber('URLReadPollRate')}
                            onChange={handleNumberChange('URLReadPollRate')}
                        />


                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>{I18n.t('active')}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>{I18n.t('Name')}</TableCell>
                                    <TableCell>{I18n.t('OID/URL')}</TableCell>
                                    <TableCell></TableCell>
                                    <TableCell>{I18n.t('Type')}</TableCell>
                                    <TableCell>{I18n.t('Path2Check')}</TableCell>
                                    <TableCell>{I18n.t('SetValue')}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {((device as any).wallbox_oid_read ?? []).map((t: any, idx: number) => (
                                     <TableRow key={idx}>
                                        <TableCell>
                                            <Checkbox
                                                checked={!!t.active}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onWallboxReadToggleActive(idx, (e.target as HTMLInputElement).checked)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                value={t.must}
                                                onChange={(e) => onWallboxReadUpdate(idx, 'must', e.target.value)}
                                                variant="standard"
                                                placeholder={I18n.t('ID')}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                value={t.Name}
                                                onChange={(e) => onWallboxReadUpdate(idx, 'Name', e.target.value)}
                                                variant="standard"
                                                placeholder={I18n.t('Name')}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <SelectOID
                                                settingName={I18n.t('OID')}
                                                socket={props.socket}
                                                theme={props.theme}
                                                themeName={props.themeName}
                                                themeType={props.themeType}
                                                Value={t.OID}
                                                onChange={(value: string) => onWallboxReadUpdate(idx, 'OID', value)}
                                            />
                                        </TableCell>

                                        <TableCell>

                                        </TableCell>

                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                value={t.Type}
                                                onChange={(e) => onWallboxReadUpdate(idx, 'Type', e.target.value)}
                                                variant="standard"
                                                placeholder={I18n.t('Type')}

                                            />
                                        </TableCell>

                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                value={t.Path2Check}
                                                onChange={(e) => onWallboxReadUpdate(idx, 'Path2Check', e.target.value)}
                                                variant="standard"
                                                placeholder={I18n.t('Path2Check')}

                                            />
                                        </TableCell>

                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                value={t.SetValue}
                                                onChange={(e) => onWallboxReadUpdate(idx, 'SetValue', e.target.value)}
                                                variant="standard"
                                                placeholder={I18n.t('SetValue')}

                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>




                    </FormControl>
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


