/* eslint-disable prefer-template */
/* eslint-disable quote-props */
/* eslint-disable prettier/prettier */
import React from 'react';

import {
    Box,
    FormControl,
    TextField,
    Select,
    InputLabel,
    MenuItem,
    Checkbox,
    FormControlLabel,
} from '@mui/material';
import type {
    SelectChangeEvent
} from '@mui/material';

import { I18n } from '@iobroker/adapter-react-v5';
import type {
    IobTheme,
    ThemeName,
    ThemeType,
    AdminConnection
} from '@iobroker/adapter-react-v5';
import type { SempDevice } from "../types";


type Props = {
    theme: IobTheme;
    onChange: (value: string) => void;
    device: SempDevice;
    socket: AdminConnection;
    themeName: ThemeName;
    themeType: ThemeType;

};

export default function GeneralSettings(props: Props): React.JSX.Element {

    // Lokaler Zustand für das Device, damit setDevice existiert
    const [device, setDevice] = React.useState<SempDevice | undefined>(props.device);

    // Wenn props.device sich ändert, lokales device synchronisieren
    React.useEffect(() => {
        setDevice(props.device);
    }, [props.device]);

    // Kurzer Helfer für sichere Felderausgabe (verwende lokalen device)
    const valString = (field: keyof SempDevice) => (device && (device as any)[field] !== undefined ? String((device as any)[field]) : '');
    const valNumber = (field: keyof SempDevice) => (device && (device as any)[field] !== undefined ? (device as any)[field] : '');

    // Persist-Funktion: ruft props.onChange mit einem string payload auf (Original-Props erwarten string)
    const persistDevice = (updated: SempDevice) => {
        try {
            if (props.onChange) {
                props.onChange(JSON.stringify(updated));
            }
        } catch (e) {
            // Fehler still ignorieren, keine Seiteffekt-Logik hier
            // Optional: console.error(e);
        }
    };

    // Generische Handler (event-basiert für TextField)
    const handleStringChange = (field: keyof SempDevice) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const val = e.target.value ?? '';
        const updated = { ...(device ?? {}), [field]: val } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Numerische Felder (behandelt leeren String als Entfernen)
    const handleNumberChange = (field: keyof SempDevice) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const raw = e.target.value;
        const updated = { ...(device ?? {}) } as any;
        if (raw === '' || raw === null) {
            // Entferne Feld oder setze auf undefined
            delete updated[field];
        } else {
            const num = Number(raw);
            updated[field] = Number.isNaN(num) ? raw : num;
        }
        const updatedTyped = updated as SempDevice;
        setDevice(updatedTyped);
        persistDevice(updatedTyped);
    };

    // Checkbox / boolean Handler
    const handleBoolChange = (field: keyof SempDevice) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.checked;
        const updated = { ...(device ?? {}), [field]: val } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Select Handler für Typen
    const handleTypeChange = (e: SelectChangeEvent<string>) => {
        const val = e.target.value ?? '';
        const updated = { ...(device ?? {}), Type: val } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };


    return (
        <div>
            <FormControl fullWidth variant="standard">

                <div style={{ display: 'flex', gap: 16 }}>
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
                        sx={{ minWidth: '30%', maxWidth: '50%' }}
                    />

                    <TextField
                        style={{ marginBottom: 16 }}
                        id='DeviceName'
                        label={I18n.t('DeviceName')}
                        variant="standard"
                        value={valString('Name')}
                        onChange={handleStringChange('Name')}
                        sx={{ minWidth: '30%', maxWidth: '50%' }}
                    />
                </div>


                <div style={{ display: 'flex', gap: 16 }}>

                    <FormControl variant="standard" sx={{ maxWidth: '50%' }}>
                        <InputLabel id="device-type-label">{I18n.t('select a type')}</InputLabel>
                        <Select
                            labelId="device-type-label"
                            value={valString('Type') ?? ''}
                            onChange={handleTypeChange}
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
                    </FormControl>


                    <TextField
                        style={{ marginBottom: 16 }}
                        id='DeviceVendor'
                        label={I18n.t('DeviceVendor')}
                        variant="standard"
                        value={valString('Vendor')}
                        onChange={handleStringChange('Vendor')}
                        sx={{ minWidth: '30%', maxWidth: '50%' }}
                    />

                    <TextField
                        style={{ marginBottom: 16 }}
                        id='DeviceSerialnumber'
                        label={I18n.t('DeviceSerialnumber')}
                        variant="standard"
                        value={valString('Serialnumber')}
                        onChange={handleStringChange('Serialnumber')}
                        sx={{ minWidth: '30%', maxWidth: '50%' }}
                    />
                </div>
            </FormControl>




            <FormControl variant="standard" fullWidth>
                <div style={{ display: 'flex', gap: 16 }}>

                    <TextField
                        style={{ marginBottom: 16 }}
                        id='DeviceMinPower'
                        label={I18n.t('DeviceMinPower (W)')}
                        variant="standard"
                        type="number"
                        value={valNumber('MinPower')}
                        onChange={handleNumberChange('MinPower')}
                        sx={{ minWidth: '20%', maxWidth: '50%' }}
                    />

                    <TextField
                        style={{ marginBottom: 16 }}
                        id='DeviceMaxPower'
                        label={I18n.t('DeviceMaxPower (W)')}
                        variant="standard"
                        type="number"
                        value={valNumber('MaxPower')}
                        onChange={handleNumberChange('MaxPower')}
                        sx={{ minWidth: '20%', maxWidth: '50%' }}
                    />
                </div>
            </FormControl>


            <FormControl variant="standard" fullWidth>
                <div style={{ display: 'flex', gap: 16 }}>

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
                                sx={{ minWidth: '20%', maxWidth: '20%' }}
                            />
                            <TextField
                                style={{ marginBottom: 16 }}
                                id='DeviceMaxOnTime'
                                label={I18n.t('DeviceMaxOnTime')}
                                variant="standard"
                                type="number"
                                value={valNumber('MaxOnTime')}
                                onChange={handleNumberChange('MaxOnTime')}
                                sx={{ minWidth: '20%', maxWidth: '20%' }}
                            />
                            <TextField
                                style={{ marginBottom: 16 }}
                                id='DeviceMinOffTime'
                                label={I18n.t('DeviceMinOffTime')}
                                variant="standard"
                                type="number"
                                value={valNumber('MinOffTime')}
                                onChange={handleNumberChange('MinOffTime')}
                                sx={{ minWidth: '20%', maxWidth: '20%' }}
                            />
                            <TextField
                                style={{ marginBottom: 16 }}
                                id='DeviceMaxOffTime'
                                label={I18n.t('DeviceMaxOffTime')}
                                variant="standard"
                                type="number"
                                value={valNumber('MaxOffTime')}
                                onChange={handleNumberChange('MaxOffTime')}
                                sx={{ minWidth: '20%', maxWidth: '20%' }}
                            />
                        </div>

                    ) : null}
                </div>
            </FormControl>
        </div>
    );
}