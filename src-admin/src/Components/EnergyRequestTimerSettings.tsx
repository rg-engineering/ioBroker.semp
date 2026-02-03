/* eslint-disable prefer-template */
/* eslint-disable quote-props */
/* eslint-disable prettier/prettier */
import React, { useEffect } from 'react';

import {
    Box,
    FormControl,
    TextField,
    Select,
    InputLabel,
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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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
import SelectOID from './SelectOID'; // vorhandene Komponente importieren (oder anpassen)
import BoxDivider from './BoxDivider'

type Props = {
    theme: IobTheme;
    onChange: (value: string) => void;
    device: SempDevice | null | undefined;
    socket: AdminConnection;
    themeName: ThemeName;
    themeType: ThemeType;
};

//
// Detaillierter Plan (Pseudocode):
// 1. Props de-strukturieren und lokale Kopien für das Device und die Timer-Settings anlegen.
// 2. useEffect verwenden, um lokale State zu aktualisieren, wenn `props.device` sich ändert.
// 3. Helferfunktionen implementieren:
//    - handleBoolChange(key): Checkbox-Änderungen verarbeiten, lokalen Device aktualisieren und props.onChange(JSON.stringify(...)) aufrufen.
//    - handleNumberChange(key): Numerische Felder verarbeiten (leer -> '', sonst Number).
//    - valNumber(key): aktuellen Wert für numerische Felder zurückgeben.
//    - onAdd(): neue leere Einstellung hinzufügen, State aktualisieren, onChange aufrufen.
//    - onRemove(idx): Eintrag entfernen, State aktualisieren, onChange aufrufen.
//    - onUpdate(idx, key, value): Eintrag in settings aktualisieren, State aktualisieren, onChange aufrufen.
// 4. Konstanten wie colCount und optional addButtonTooltip bereitstellen.
// 5. JSX rendern und dabei lokale Variablen (device, settings, Funktionen) benutzen.
// 6. Alle zuvor fehlenden Komponenten (Tooltip, IconButton, AddIcon, DeleteIcon) importieren.
//
// Umsetzung erfolgt direkt unten.
//

export default function EnergyRequestTimerSettings(props: Props): React.JSX.Element {
    const { device: deviceProp, onChange } = props;

    // Lokales Device und Settings verwalten
    const [localDevice, setLocalDevice] = React.useState<any>(deviceProp ?? {});
    const [settings, setSettings] = React.useState<any[]>(
        () => ((deviceProp as any)?.DeviceTimerRequests) ?? ((deviceProp as any)?.EnergyRequests) ?? []
    );

    useEffect(() => {
        setLocalDevice(deviceProp ?? {});
        setSettings(((deviceProp as any)?.DeviceTimerRequests) ?? ((deviceProp as any)?.EnergyRequests) ?? []);
    }, [deviceProp]);

    const pushChange = (updatedDevice: any) => {
        setLocalDevice(updatedDevice);
        try {
            // onChange erwartet einen string laut Props; JSON.stringify senden
            onChange && onChange(JSON.stringify(updatedDevice));
        } catch {
            // Fallback: nothing
        }
    };

    const handleBoolChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = !!e.target.checked;
        const updated = { ...(localDevice ?? {}), [key]: val };
        pushChange(updated);
    };

    const valNumber = (key: string) => {
        if (!localDevice) return '';
        const v = (localDevice as any)[key];
        return v === undefined || v === null ? '' : v;
    };

    const handleNumberChange = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const val = raw === '' ? '' : Number(raw);
        const updated = { ...(localDevice ?? {}), [key]: val };
        pushChange(updated);
    };

    const colCount = 7;
    const addButtonTooltip: string | undefined = undefined;

    const onAdd = () => {
        const newEntry = {
            ID: '',
            Days: '',
            EarliestStartTime: '',
            LatestEndTime: '',
            MinRunTime: 0,
            MaxRunTime: 0,
        };
        const newSettings = [...settings, newEntry];
        setSettings(newSettings);
        const updated = { ...(localDevice ?? {}), DeviceTimerRequests: newSettings };
        pushChange(updated);
    };

    const onRemove = (idx: number) => {
        const newSettings = settings.filter((_: any, i: number) => i !== idx);
        setSettings(newSettings);
        const updated = { ...(localDevice ?? {}), DeviceTimerRequests: newSettings };
        pushChange(updated);
    };

    const onUpdate = (idx: number, key: string, value: any) => {
        const newSettings = settings.map((s: any, i: number) => (i === idx ? { ...s, [key]: value } : s));
        setSettings(newSettings);
        const updated = { ...(localDevice ?? {}), DeviceTimerRequests: newSettings };
        pushChange(updated);
    };

    return (
        <div>
            <FormControlLabel
                control={
                    <Checkbox
                        color="primary"
                        checked={!!(localDevice && (localDevice as any).DeviceTimerCancelIfNotOn)}
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
                value={valNumber('DeviceTimerCancelIfNotOnTime')}
                onChange={handleNumberChange('DeviceTimerCancelIfNotOnTime')}
            />
            <FormControlLabel
                control={
                    <Checkbox
                        color="primary"
                        checked={!!(localDevice && (localDevice as any).DishwasherMode)}
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
                        {(!settings || settings.length === 0) ? (
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
                                        onChange={(e) => onUpdate(idx, 'MinRunTime', e.target.value === '' ? '' : Number(e.target.value))}
                                        variant="standard"
                                        placeholder={I18n.t('MinRunTime')}
                                        type="number"
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
    );
}