/* eslint-disable prefer-template */
/* eslint-disable quote-props */
/* eslint-disable prettier/prettier */
import React from 'react';

import {
    Box,
    TextField,
    Select,
    MenuItem,
    Checkbox,
    FormControlLabel,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    IconButton,
    FormControl,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

import { I18n } from '@iobroker/adapter-react-v5';
import type {
    IobTheme,
    ThemeName,
    ThemeType,
    AdminConnection
} from '@iobroker/adapter-react-v5';

import type { SempDevice, EnergyRequestPeriod } from "../types";
import BoxDivider from './BoxDivider'

type Props = {
    theme: IobTheme;
    onChange: (value: string) => void;
    device: SempDevice;
    socket: AdminConnection;
    themeName: ThemeName;
    themeType: ThemeType;
};

//
// Detaillierter Plan / Pseudocode:
// 1. Behalte die component state wie gehabt (`device`, `EnergyRequestPeriods`).
// 2. useEffect synchronisiert lokale States mit `props.device` wenn sich props ändern.
// 3. Alle lokalen Hilfsfunktionen mit expliziten Rückgabetypen versehen:
//    - `persistDevice(updated: SempDevice): void`
//    - `handleBoolChange(key: string): (e: React.ChangeEvent<HTMLInputElement>) => void`
//    - `valNumber(key: string): string | number`
//    - `handleNumberChange(key: string): (e: React.ChangeEvent<HTMLInputElement>) => void`
//    - `onAdd(): void`, `onRemove(idx: number): void`, `onUpdate(idx: number, key: string, value: any): void`
// 4. Funktionen erzeugen aktualisierte Objekte, rufen `setState` und `persistDevice` auf.
// 5. JSX bleibt unverändert bis auf die typannotierten Funktionen.
// 6. Keine Änderungen an der Logik, nur TypeScript-Rückgabetypen hinzufügen, um `@typescript-eslint/explicit-function-return-type` zu erfüllen.
//


export default function EnergyRequestTimerSettings(props: Props): React.JSX.Element {
    const [device, setDevice] = React.useState<SempDevice | undefined>(props.device);

    // energyRequests als Array-Typ
    const [EnergyRequestPeriods, setEnergyRequestPeriods] = React.useState<EnergyRequestPeriod[]>(props.device?.EnergyRequestPeriods ?? []);


    console.log('EnergyRequestPeriods :' + JSON.stringify(EnergyRequestPeriods));

    // Wenn props.device sich ändert, lokales device und energyRequests synchronisieren
    React.useEffect(() => {
        setDevice(props.device);
        setEnergyRequestPeriods(props.device?.EnergyRequestPeriods ?? []);
    }, [props.device]);

    // Persist-Funktion: ruft props.onChange mit einem string payload auf (Original-Props erwarten string)
    const persistDevice = (updated: SempDevice): void => {
        try {
            if (props.onChange) {
                props.onChange(JSON.stringify(updated));
            }
        } catch (e) {
            // Fehler still ignorieren
            console.error('Failed to persist device settings:', e);
        }
    };


    const handleBoolChange = (key: string): ((e: React.ChangeEvent<HTMLInputElement>) => void) => {
        return (e: React.ChangeEvent<HTMLInputElement>): void => {
            const val = !!e.target.checked;
            const updated = ({ ...(device ?? {}), [key]: val } as SempDevice);
            setDevice(updated);
            persistDevice(updated);
        };
    };

    type NumberKeys<T> = {
        [K in keyof T]: T[K] extends number | undefined ? K : never
    }[keyof T];

    const valNumber = (key: NumberKeys<SempDevice>): string | number => {
        if (!device) {
            return '';
        }

        const v = device[key];

        return v ?? '';
    };

    const handleNumberChange = (key: string): ((e: React.ChangeEvent<HTMLInputElement>) => void) => {
        return (e: React.ChangeEvent<HTMLInputElement>): void => {
            const raw = e.target.value;
            const val = raw === '' ? '' : Number(raw);
            const updated = ({ ...(device ?? {}), [key]: val } as SempDevice);
            setDevice(updated);
            persistDevice(updated);
        };
    };

    const colCount = 7;
    const addButtonTooltip: string | undefined = undefined;



    const onAdd = (): void => {
        const newEntry: EnergyRequestPeriod = {
            ID: String(EnergyRequestPeriods.length + 1),
            Days: 'everyDay',
            EarliestStartTime: '08:00',
            LatestEndTime: '16:00',
            MinRunTime: 60,
            MaxRunTime: 240,
        };
        const newSettings = [...EnergyRequestPeriods, newEntry];
        setEnergyRequestPeriods(newSettings);
        const updated = ({ ...(device ?? {}), EnergyRequestPeriods: newSettings } as SempDevice);
        setDevice(updated);
        persistDevice(updated);
    };

    const onRemove = (idx: number): void => {
        const newSettings = EnergyRequestPeriods.filter((_: any, i: number) => i !== idx);
        setEnergyRequestPeriods(newSettings);
        const updated = ({ ...(device ?? {}), EnergyRequestPeriods: newSettings } as SempDevice);
        setDevice(updated);
        persistDevice(updated);
    };

    const onUpdate = (idx: number, key: string, value: any): void => {
        const newSettings = EnergyRequestPeriods.map((s: any, i: number) => (i === idx ? { ...s, [key]: value } : s));
        setEnergyRequestPeriods(newSettings);
        const updated = ({ ...(device ?? {}), EnergyRequestPeriods: newSettings } as SempDevice);
        setDevice(updated);
        persistDevice(updated);
    };

    return (
        <Box
            style={{ margin: 10 }}
        >

            <BoxDivider
                Name={I18n.t('energy requests')}
                theme={props.theme}
            />

            <Box
                style={{ margin: 10 }}
            >
                <FormControlLabel
                    control={
                        <Checkbox
                            color="primary"
                            checked={!!(device && device.TimerActive)}
                            onChange={handleBoolChange('TimerActive')}
                            aria-label="energy request timer active"
                        />
                    }
                    label={I18n.t('energy request timer active')}
                />
            </Box>

            {device && device.TimerActive === true ? (
                <Box
                    style={{ margin: 10 }}
                >

                    <FormControlLabel
                        control={
                            <Checkbox
                                color="primary"
                                checked={!!(device && device.TimerCancelIfNotOn)}
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
                        InputProps={{ inputProps: { min: 0 } }}
                        value={valNumber('TimerCancelIfNotOnTime')}
                        onChange={handleNumberChange('TimerCancelIfNotOnTime')}
                        sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                    />


                    <FormControlLabel
                        control={
                            <Checkbox
                                color="primary"
                                checked={!!(device && device.DishwasherMode)}
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
                                {(EnergyRequestPeriods.length === 0) ? (
                                    <TableRow>
                                        <TableCell colSpan={colCount} style={{ fontStyle: 'italic' }}>{I18n.t('nothing configured')}</TableCell>
                                    </TableRow>
                                ) : EnergyRequestPeriods.map((t: any, idx: number) => (
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

                                            <FormControl variant="standard" >
                                            <Select
                                                labelId="device-type-label"
                                                value={t.Days}
                                                onChange={(e) => onUpdate(idx, 'Days', e.target.value)}
                                                displayEmpty
                                            >
                                                <MenuItem value="everyDay">
                                                    <em>{I18n.t('everyDay')}</em>
                                                </MenuItem>
                                                <MenuItem value="Monday">
                                                    <em>{I18n.t('Monday')}</em>
                                                </MenuItem>
                                                <MenuItem value="Tuesday">
                                                    <em>{I18n.t('Tuesday')}</em>
                                                </MenuItem>
                                                <MenuItem value="Wednesday">
                                                    <em>{I18n.t('Wednesday')}</em>
                                                </MenuItem>
                                                <MenuItem value="Thursday">
                                                    <em>{I18n.t('Thursday')}</em>
                                                </MenuItem>
                                                <MenuItem value="Friday">
                                                    <em>{I18n.t('Friday')}</em>
                                                </MenuItem>
                                                <MenuItem value="Saturday">
                                                    <em>{I18n.t('Saturday')}</em>
                                                </MenuItem>
                                                <MenuItem value="Sunday">
                                                    <em>{I18n.t('Sunday')}</em>
                                                </MenuItem>

                                                </Select>
                                            </FormControl>


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
                                                onChange={(e) => onUpdate(idx, 'MinRunTime', e.target.value === '' ? '' : Number(e.target.value))}
                                                variant="standard"
                                                placeholder={I18n.t('MinRunTime')}
                                                type="number"
                                                InputProps={{ inputProps: { min: 0 } }}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <TextField
                                                fullWidth
                                                value={t.MaxRunTime}
                                                onChange={(e) => onUpdate(idx, 'MaxRunTime', e.target.value === '' ? '' : Number(e.target.value))}
                                                variant="standard"
                                                placeholder={I18n.t('MaxRunTime')}
                                                type="number"
                                                InputProps={{ inputProps: { min: 0 } }}
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
                </Box>
            ) : null}
        </Box>
    );
}