/* eslint-disable prefer-template */
/* eslint-disable quote-props */
/* eslint-disable prettier/prettier */
import React, {  useCallback } from 'react';
import type {
    AdminConnection,
    IobTheme,
    ThemeName,
    ThemeType
} from '@iobroker/adapter-react-v5';
import { I18n } from '@iobroker/adapter-react-v5';
import AutorenewIcon from '@mui/icons-material/Autorenew';

import type { SempAdapterConfig } from "../types";

import {
    Checkbox,
    FormControlLabel,
    IconButton,
    Box,
    TextField
} from '@mui/material';

import BoxDivider from '../Components/BoxDivider'


interface MainSettingsProps {
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

export default function MainSettings(props: MainSettingsProps): React.JSX.Element {

    console.log("MainSettings render ");


    type KeysOfType<T, ValueType> = {
        [K in keyof T]: T[K] extends ValueType ? K : never
    }[keyof T];

    type StringKeys = KeysOfType<SempAdapterConfig, string | undefined>;


    const valString = (name: StringKeys): string => {
        const v = props.native?.[name];
        return v ?? '';
    };
    /*
    const valString = (name: string): string => {
        const v = (props.native as SempAdapterConfig)?.[name];
        return v === undefined || v === null ? '' : String(v);
    };
    */

    const valNumber = (name: keyof SempAdapterConfig): number | '' => {
        const v = props.native?.[name];
        if (v === undefined || v === null || v === '') {
            return '';
        }
        const n = Number(v);
        return Number.isNaN(n) ? '' : n;
    };

    // updateDevice implementieren und als useCallback bereitstellen
    const updateDevice = useCallback((updated: SempAdapterConfig): void => {
        props.changeNative(updated);
    }, [props.changeNative]);

    // String-Handler erwartet jetzt das ChangeEvent
    const handleStringChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const value = e.target.value;
        const updated = { ...(props.native ?? {}), [name]: value } as SempAdapterConfig;
        updateDevice(updated);
    };

    // Number-Handler auf allgemeinen ChangeEvent-Typ anpassen
    const handleNumberChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const raw = (e.target as HTMLInputElement).value;
        const num = raw === '' ? undefined : Number(raw);
        const updated = { ...(props.native ?? {}), [name]: num } as SempAdapterConfig;
        updateDevice(updated);
    };

    const handleBoolChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>): void => {
        const checked = e.target.checked;
        const updated = { ...(props.native ?? {}), [name]: checked } as SempAdapterConfig;
        updateDevice(updated);
    };

    // Handler: Generiere eine DeviceBaseID basierend auf Name oder ID (gesäubert)
    const handleGenerateUUID = async (): Promise<void> => {
        if (!props.native) {
            return;
        }

        try {
            const newUUID = (await props.socket.sendTo(props.adapterName + "." + props.instance, 'getUUID'));
            const updated: SempAdapterConfig = { ...(props.native), UUID: newUUID ?? '' };

            // Direkt persistieren
            props.changeNative(updated);
        } catch (err) {
            console.error("Failed to generate UUID:", err);
        }
    };

    return (
        <Box style={{ width: 'calc(100% - 8px)', minHeight: '100%' }}>
            <Box
                style={{ margin: 10 }}
            >
                <BoxDivider
                    Name={I18n.t('general configuration')}
                    theme={props.theme}
                />

                <TextField
                    style={{ marginBottom: 16 }}
                    id='IPAddress'
                    label={I18n.t('IPAddress')}
                    variant="standard"
                    type="text"
                    value={valString('IPAddress')}
                    onChange={handleStringChange('IPAddress')}
                    sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                />

                <TextField
                    style={{ marginBottom: 16 }}
                    id='UUID'
                    label={I18n.t('UUID')}
                    variant="standard"
                    type="text"
                    value={valString('UUID')}
                    onChange={handleStringChange('UUID')}
                    sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                />

                <IconButton
                    color="secondary"
                    onClick={handleGenerateUUID}
                    sx={{ marginTop: '6px' }}
                    aria-label={I18n.t('generateUUID')}
                >
                    <AutorenewIcon />
                </IconButton>


                <TextField
                    style={{ marginBottom: 16 }}
                    id='SempPort'
                    label={I18n.t('SempPort')}
                    variant="standard"
                    type="number"
                    InputProps={{ inputProps: { min: 0 } }}
                    value={valNumber('SempPort')}
                    onChange={handleNumberChange('SempPort')}
                    sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                />

                <TextField
                    style={{ marginBottom: 16 }}
                    id='SempName'
                    label={I18n.t('SempName')}
                    variant="standard"
                    type="text"
                    value={valString('SempName')}
                    onChange={handleStringChange('SempName')}
                    sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                />

                <TextField
                    style={{ marginBottom: 16 }}
                    id='SempManufacturer'
                    label={I18n.t('SempManufacturer')}
                    variant="standard"
                    type="text"
                    value={valString('SempManufacturer')}
                    onChange={handleStringChange('SempManufacturer')}
                    sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                />


            </Box>

            <Box
                style={{ margin: 10 }}
            >
                <BoxDivider
                    Name={I18n.t('logging configuration')}
                    theme={props.theme}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            color="primary"
                            checked={!!(props && props.native.extendedLog)}
                            onChange={handleBoolChange('extendedLog')}
                            aria-label="extendedLog"
                        />
                    }
                    label={I18n.t('extendedLog')}
                    sx={{ minWidth: '20%', maxWidth: '40%', marginRight: '10px' }}
                />

                <FormControlLabel
                    control={
                        <Checkbox
                            color="primary"
                            checked={!!(props && props.native.LogToCSV)}
                            onChange={handleBoolChange('LogToCSV')}
                            aria-label="LogToCSV"
                        />
                    }
                    label={I18n.t('LogToCSV')}
                    sx={{ minWidth: '20%', maxWidth: '40%', marginRight: '10px' }}
                />



                {
                    (props && props.native.LogToCSV) === true ? (
                        <TextField
                            style={{ marginBottom: 16 }}
                            id='LogToCSVPath'
                            label={I18n.t('LogToCSVPath')}
                            variant="standard"
                            type="text"
                            value={valString('LogToCSVPath')}
                            onChange={handleStringChange('LogToCSVPath')}
                            sx={{ minWidth: '20%', maxWidth: '20%', marginRight: '10px' }}
                        />


                    ) : null
                }

            </Box>

        </Box>
    );
}
