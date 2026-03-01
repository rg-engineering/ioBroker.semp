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
import BoxDivider from './BoxDivider'


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
    React.useEffect((): void => {
        setDevice(props.device);
    }, [props.device]);

    // Kurzer Helfer für sichere Felderausgabe (verwende lokalen device)
    type KeysOfType<T, ValueType> = {
        [K in keyof T]: T[K] extends ValueType ? K : never
    }[keyof T];

    type StringKeys = KeysOfType<SempDevice, string | undefined>;

    //const valString = (field: keyof SempDevice): string => (device && (device)[field] !== undefined ? String((device)[field]) : '');

    const valString = (field: StringKeys): string => {
        if (!device) {
            return '';
        }
        const v = device[field];

        return v ?? '';
    };

    const valNumber = (key: NumberKeys<SempDevice>): string | number => {
        if (!device) {
            return '';
        }

        const v = device[key];

        return v ?? '';
    };

    //const valNumber = (field: keyof SempDevice): string | number => (device && (device as SempDevice)[field] !== undefined ? (device as SempDevice)[field] : '');

    // Persist-Funktion: ruft props.onChange mit einem string payload auf (Original-Props erwarten string)
    const persistDevice = (updated: SempDevice): void => {
        try {
            if (props.onChange) {
                props.onChange(JSON.stringify(updated));
            }
        } catch (e) {
            // Fehler still ignorieren, keine Seiteffekt-Logik hier
            // Optional: console.error(e);
            console.error('Failed to persist device:', e);
        }
    };  

    // Handler für DeviceID (extrahiert, damit kein inline-Anonymous ohne Typ übrig bleibt)
    const handleIdChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const newId = e.target.value ?? '';
        const updated = { ...(device ?? {}), ID: newId } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };

    // Generische Handler (event-basiert für TextField)
    const handleStringChange = (field: keyof SempDevice): ((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void) => {
        return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
            const val = e.target.value ?? '';
            const updated = { ...(device ?? {}), [field]: val } as SempDevice;
            setDevice(updated);
            persistDevice(updated);
        };
    };

    type NumberKeys<T> = {
        [K in keyof T]: T[K] extends number | undefined ? K : never
    }[keyof T];

    // Numerische Felder (behandelt leeren String als Entfernen)
    const handleNumberChange =
        (field: NumberKeys<SempDevice>) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {

                const raw = e.target.value;
                const updated = { ...(device ?? {}) } as SempDevice;

                if (raw === '') {
                    delete updated[field];
                } else {
                    const num = Number(raw);
                    if (!Number.isNaN(num)) {
                        updated[field] = num;
                    }
                }

                setDevice(updated);
                persistDevice(updated);
            };

    // Checkbox / boolean Handler
    const handleBoolChange = (field: keyof SempDevice): ((e: React.ChangeEvent<HTMLInputElement>) => void) => {
        return (e: React.ChangeEvent<HTMLInputElement>): void => {
            const val = e.target.checked;
            const updated = { ...(device ?? {}), [field]: val } as SempDevice;
            setDevice(updated);
            persistDevice(updated);
        };
    };

    // Select Handler für Typen
    const handleTypeChange = (e: SelectChangeEvent<string>): void => {
        const val = e.target.value ?? '';
        const updated = { ...(device ?? {}), Type: val } as SempDevice;
        setDevice(updated);
        persistDevice(updated);
    };


    return (
        <Box
            style={{ margin: 10 }}
        >
            <BoxDivider
                Name={I18n.t('main settings')}
                theme={props.theme}
            />

            <Box
                style={{ margin: 10 }}
            >
                <TextField
                    id='DeviceID'
                    label={I18n.t('DeviceID')}
                    variant="standard"
                    value={valString('ID')}
                    onChange={handleIdChange}
                    sx={{ minWidth: '30%', maxWidth: '50%', marginRight: '10px' }}
                />

                <TextField
                    id='DeviceName'
                    label={I18n.t('DeviceName')}
                    variant="standard"
                    value={valString('Name')}
                    onChange={handleStringChange('Name')}
                    sx={{ minWidth: '30%', maxWidth: '50%', marginRight: '10px' }}
                />
            </Box>

            <Box
                style={{ margin: 10 }}
            >
                <FormControl variant="standard" sx={{ minWidth: '30%', maxWidth: '50%', marginRight: '10px' }}>
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
                    id='DeviceVendor'
                    label={I18n.t('DeviceVendor')}
                    variant="standard"
                    value={valString('Vendor')}
                    onChange={handleStringChange('Vendor')}
                    sx={{ minWidth: '30%', maxWidth: '50%', marginRight: '10px' }}
                />

                <TextField
                    id='DeviceSerialnumber'
                    label={I18n.t('DeviceSerialnumber')}
                    variant="standard"
                    value={valString('SerialNr')}
                    onChange={handleStringChange('SerialNr')}
                    sx={{ minWidth: '30%', maxWidth: '50%', marginRight: '10px' }}
                />
            </Box>

            <Box
                style={{ margin: 10 }}
            >
                <TextField
                    id='DeviceMinPower'
                    label={I18n.t('DeviceMinPower (W)')}
                    variant="standard"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={valNumber('MinPower')}
                    onChange={handleNumberChange('MinPower')}
                    sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                />

                <TextField
                    id='DeviceMaxPower'
                    label={I18n.t('DeviceMaxPower (W)')}
                    variant="standard"
                    type="number"
                    inputProps={{ min: 0 }}
                    value={valNumber('MaxPower')}
                    onChange={handleNumberChange('MaxPower')}
                    sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                />
            </Box>

            <Box
                style={{ margin: 10 }}
            >
                <FormControlLabel
                    control={
                        <Checkbox
                            color="primary"
                            checked={!!(device && device.InterruptionsAllowed)}
                            onChange={handleBoolChange('InterruptionsAllowed')}
                            aria-label="device Interruptions Allowed"
                        />
                    }
                    label={I18n.t('Interruption Allowed')}
                />

                {(device && device.InterruptionsAllowed) === true ? (
                    <div>
                        <TextField
                            id='DeviceMinOnTime'
                            label={I18n.t('DeviceMinOnTime')}
                            variant="standard"
                            type="number"
                            inputProps={{ min: 0 }}
                            value={valNumber('MinOnTime')}
                            onChange={handleNumberChange('MinOnTime')}
                            sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                        />
                        <TextField
                            id='DeviceMaxOnTime'
                            label={I18n.t('DeviceMaxOnTime')}
                            variant="standard"
                            type="number"
                            inputProps={{ min: 0 }}
                            value={valNumber('MaxOnTime')}
                            onChange={handleNumberChange('MaxOnTime')}
                            sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                        />
                        <TextField
                            id='DeviceMinOffTime'
                            label={I18n.t('DeviceMinOffTime')}
                            variant="standard"
                            type="number"
                            inputProps={{ min: 0 }}
                            value={valNumber('MinOffTime')}
                            onChange={handleNumberChange('MinOffTime')}
                            sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                        />
                        <TextField
                            id='DeviceMaxOffTime'
                            label={I18n.t('DeviceMaxOffTime')}
                            variant="standard"
                            type="number"
                            inputProps={{ min: 0 }}
                            value={valNumber('MaxOffTime')}
                            onChange={handleNumberChange('MaxOffTime')}
                            sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                        />
                    </div>

                ) : null}
            </Box>
        </Box>
    );
}