# Implementierungs-Spec: SEMP Runtime Sanity Validator

## 1. Ziel

Der **SEMP Runtime Sanity Validator** soll bekannte bzw. offensichtliche
Fehler in den an den SMA Sunny Home Manager (SHM) gesendeten SEMP-Daten
frühzeitig erkennen.

Hintergrund ist, dass der SHM bei fehlerhaften SEMP-Nachrichten häufig
keine für den Anwender zugängliche Fehlermeldung liefert, sondern die
Daten lediglich ignoriert. Dadurch ist die Fehlersuche unnötig
aufwendig.

Der Validator verfolgt zwei Ziele:

1.  **Konfigurationsfehler des Benutzers frühzeitig und verständlich
    erkennen.**
2.  **Bei Codefehlern anzeigen, welcher Teil der tatsächlich erzeugten
    SEMP-Nachricht vermutlich fehlerhaft ist.**

> **Wichtig:** Der Validator ist ein Diagnose-Sicherheitsnetz für
> Sonderfälle. Er soll **keine vollständige Implementierung oder
> Validierung der gesamten SEMP-Spezifikation** werden.

------------------------------------------------------------------------

## 2. Einhängepunkt

Die Prüfung soll unmittelbar vor dem Senden der SEMP-Antwort an den SHM
erfolgen.

Aktuell wird die Antwort in `SEMPServer.ts` erzeugt und direkt gesendet:

``` ts
const devices = this.convertDevices(deviceList);
res.send(this.convertJSToXML(devices));
```

Empfohlener Ablauf:

``` ts
const devices = this.convertDevices(deviceList);
const xml = this.convertJSToXML(devices);

const issues = this.validateSempResponse(xml);

if (issues.length > 0) {
    this.logSempValidationIssues(issues);
}

res.send(xml);
```

Damit wird exakt die XML-Nachricht geprüft, die anschließend an den SHM
gesendet wird. Dadurch können sowohl falsche Benutzerdaten als auch
Fehler bei der XML-Erzeugung erkannt werden.

------------------------------------------------------------------------

## 3. Grundsätzliches Verhalten

Der Validator darf die bestehende Funktion des Adapters zunächst **nicht
verändern**.

Ein Validierungsfehler:

-   wird geloggt,
-   verhindert nicht das Senden der Nachricht,
-   erzeugt keine Exception nach außen,
-   darf den HTTP-Request nicht fehlschlagen lassen,
-   verändert oder korrigiert die erzeugte SEMP-Nachricht nicht.

Der Validator ist in der ersten Version somit ein reines
Diagnosewerkzeug.

Empfohlene Schnittstelle:

``` ts
interface SempValidationIssue {
    rule: SempValidationRule;
    path: string;
    message: string;
    deviceId?: string;
    deviceName?: string;
    value?: unknown;
}

type SempValidationRule =
    | "EMPTY_VALUE"
    | "MISSING_IDENTIFICATION"
    | "EMPTY_PLANNING_REQUEST"
    | "INCOMPLETE_TIMEFRAME"
    | "INVALID_RANGE";

private validateSempResponse(xml: string): SempValidationIssue[]
```

Die Prüfungslogik soll von der Log-Ausgabe getrennt bleiben, damit sie
einfach per Unit-Test getestet werden kann.

------------------------------------------------------------------------

# 4. Validierungsregeln -- Version 1

## R1 -- Keine leeren Leaf-Elemente

Jedes im erzeugten XML vorhandene Element, das keine weiteren
Child-Elemente besitzt, muss einen Wert enthalten.

Ungültig:

``` xml
<MinPowerConsumption/>
```

``` xml
<DeviceVendor></DeviceVendor>
```

``` xml
<LatestEnd>   </LatestEnd>
```

Gültig ist dagegen, wenn ein **optionales Element vollständig fehlt**:

``` xml
<Characteristics>
    <MaxPowerConsumption>2000</MaxPowerConsumption>
</Characteristics>
```

Die Prüfung soll möglichst generisch erfolgen und nicht über eine Liste
einzelner XML-Felder implementiert werden.

Beispielmeldung:

``` text
SEMP validation: empty value at
Device2EM.DeviceInfo[0].Characteristics.MinPowerConsumption
```

**Rule ID:** `EMPTY_VALUE`

------------------------------------------------------------------------

## R2 -- Identification prüfen

Für jedes `DeviceInfo` müssen folgende Felder vorhanden und dürfen nicht
leer sein:

-   `DeviceId`
-   `DeviceName`
-   `DeviceType`
-   `DeviceSerial`
-   `DeviceVendor`

Beispielmeldung:

``` text
SEMP validation: DeviceVendor is missing or empty
DeviceId: F-12345678-000000000001-00
```

Falls `DeviceId` selbst fehlt, soll -- soweit möglich -- `DeviceName`
oder der Array-Index des Gerätes zur Identifikation verwendet werden.

**Rule ID:** `MISSING_IDENTIFICATION`

------------------------------------------------------------------------

## R3 -- PlanningRequest ist optional

Ein Gerät ohne aktuellen Energiebedarf darf keinen `PlanningRequest`
besitzen.

Das vollständige Fehlen eines `PlanningRequest` ist daher **kein
Fehler**.

Der Validator darf insbesondere niemals allein aufgrund eines fehlenden
`PlanningRequest` eine Meldung erzeugen.

``` text
PlanningRequest fehlt
→ OK
```

------------------------------------------------------------------------

## R4 -- Vorhandener PlanningRequest benötigt mindestens einen Timeframe

Falls ein `PlanningRequest` im finalen XML vorhanden ist, muss darin
mindestens ein `Timeframe` vorhanden sein.

Ungültig:

``` xml
<PlanningRequest/>
```

oder:

``` xml
<PlanningRequest>
</PlanningRequest>
```

Ohne Energiebedarf soll das komplette `PlanningRequest`-Element
weggelassen werden.

**Rule ID:** `EMPTY_PLANNING_REQUEST`

------------------------------------------------------------------------

## R5 -- Grundlegende Timeframe-Felder

Für jeden vorhandenen `Timeframe` müssen mindestens folgende Werte
vorhanden und nicht leer sein:

-   `DeviceId`
-   `EarliestStart`
-   `LatestEnd`
-   `MaxRunningTime`

`MinRunningTime` bleibt optional.

Beispiel für einen fehlerhaften Timeframe:

``` xml
<Timeframe>
    <DeviceId>F-23906479-000000000001-01</DeviceId>
</Timeframe>
```

Erwartete Meldung:

``` text
SEMP validation: incomplete Timeframe for device
F-23906479-000000000001-01
Missing: EarliestStart, LatestEnd, MaxRunningTime
```

**Rule ID:** `INCOMPLETE_TIMEFRAME`

------------------------------------------------------------------------

## R6 -- Zeitfenster prüfen

Für jeden vorhandenen `Timeframe` muss gelten:

``` text
EarliestStart < LatestEnd
```

Beispiele:

``` text
EarliestStart = 0
LatestEnd     = 7200
→ OK
```

``` text
EarliestStart = 7200
LatestEnd     = 3600
→ ERROR
```

``` text
EarliestStart = 3600
LatestEnd     = 3600
→ ERROR
```

In Version 1 sollen **keine komplexeren Zeitregeln** implementiert
werden.

**Rule ID:** `INVALID_RANGE`

------------------------------------------------------------------------

## R7 -- Min/Max-Werte plausibilisieren

Wenn sowohl ein `Min...`- als auch ein entsprechender `Max...`-Wert
vorhanden sind, muss gelten:

``` text
Min <= Max
```

Zu prüfen sind zunächst:

``` text
MinRunningTime <= MaxRunningTime
MinPowerConsumption <= MaxPowerConsumption
MinOnTime <= MaxOnTime
MinOffTime <= MaxOffTime
```

### Wichtig

Aus dieser Regel darf **keine Anwesenheitspflicht** abgeleitet werden.

Beispielsweise ist aufgrund dieser Regel:

``` xml
<MinOnTime>60</MinOnTime>
```

ohne `MaxOnTime` **kein Fehler**.

Die Min/Max-Prüfung erfolgt ausschließlich dann, wenn beide Werte
tatsächlich vorhanden sind.

**Rule ID:** `INVALID_RANGE`

------------------------------------------------------------------------

# 5. Fehler sammeln statt abbrechen

Der Validator soll alle gefundenen Probleme eines Responses sammeln und
nicht beim ersten Fehler abbrechen.

Beispiel:

``` text
SEMP validation found 3 issue(s):

[EMPTY_VALUE]
Device: Waschmaschine
DeviceId: F-53088661-000000000001-00
Path: DeviceInfo.Characteristics.MinPowerConsumption
Value is empty. Either provide a value or omit the element.

[INVALID_RANGE]
Device: Wallbox
DeviceId: F-12345678-000000000001-00
Path: PlanningRequest.Timeframe[0]
EarliestStart (7200) must be smaller than LatestEnd (3600).

[INCOMPLETE_TIMEFRAME]
DeviceId: F-23906479-000000000001-01
Missing: LatestEnd, MaxRunningTime
```

Dadurch sollen mehrere fehlerhafte Geräte bzw. Konfigurationen mit einem
einzigen SHM-Abruf diagnostizierbar sein.

------------------------------------------------------------------------

# 6. Logging

Im Log sollen nach Möglichkeit immer folgende Informationen enthalten
sein:

-   Rule ID
-   XML-Pfad bzw. betroffener Bereich
-   `DeviceId`
-   `DeviceName`, sofern auflösbar
-   fehlerhafter Wert, sofern sinnvoll
-   verständliche Beschreibung des Problems

Bei einem Fehler kann zusätzlich ein kleiner XML-Kontext ausgegeben
werden.

Beispiel:

``` text
SEMP validation found an issue:

[EMPTY_VALUE]
Device: Waschmaschine
DeviceId: F-53088661-000000000001-00
Path: DeviceInfo.Characteristics.MinPowerConsumption

Optional element is present but contains no value.
Either provide a value or omit the element.

XML context:
<Characteristics>
    <MaxPowerConsumption>2000</MaxPowerConsumption>
    <MinPowerConsumption/>
</Characteristics>
```

Das komplette XML soll nicht bei jedem fehlerfreien Poll zusätzlich
geloggt werden.

------------------------------------------------------------------------

# 7. Technische Vorgaben

`SEMPServer.ts` verwendet bereits `xml-js`:

``` ts
import { js2xml, xml2js } from "xml-js";
```

Der Validator soll daher möglichst die vorhandene Infrastruktur
verwenden.

Er soll:

-   keine neue Runtime-Dependency benötigen,
-   keine Netzwerkzugriffe durchführen,
-   keine XSD-Datei zur Laufzeit benötigen,
-   keine vollständige XSD-Validierung implementieren,
-   keine SEMP-Nachrichten verändern,
-   keine Werte automatisch korrigieren,
-   keine Exception nach außen werfen,
-   den Versand der SEMP-Nachricht in Version 1 nicht blockieren.

Ein Fehler innerhalb des Validators selbst darf insbesondere nicht dazu
führen, dass eine bisher funktionierende SEMP-Kommunikation ausfällt.

------------------------------------------------------------------------

# 8. Empfohlene Implementierungsstruktur

Beispiel:

``` ts
interface SempValidationIssue {
    rule: SempValidationRule;
    path: string;
    message: string;
    deviceId?: string;
    deviceName?: string;
    value?: unknown;
}

type SempValidationRule =
    | "EMPTY_VALUE"
    | "MISSING_IDENTIFICATION"
    | "EMPTY_PLANNING_REQUEST"
    | "INCOMPLETE_TIMEFRAME"
    | "INVALID_RANGE";

private validateSempResponse(xml: string): SempValidationIssue[] {
    const issues: SempValidationIssue[] = [];

    // 1. XML parsen
    // 2. Generisch leere Leaf-Elemente suchen
    // 3. Identification prüfen
    // 4. Vorhandene PlanningRequests prüfen
    // 5. Timeframes prüfen
    // 6. Min/Max-Paare prüfen

    return issues;
}

private logSempValidationIssues(issues: SempValidationIssue[]): void {
    // Fehler gesammelt und verständlich ausgeben
}
```

Aufruf im bestehenden GET-Handler:

``` ts
const deviceList = this.Gateway.getAllDevices();
const devices = this.convertDevices(deviceList);
const xml = this.convertJSToXML(devices);

try {
    const issues = this.validateSempResponse(xml);

    if (issues.length > 0) {
        this.logSempValidationIssues(issues);
    }
} catch (error) {
    // Der Validator selbst darf die SEMP-Kommunikation nicht verhindern.
    this.logError("SEMP validation failed internally: " + String(error));
}

res.send(xml);
```

------------------------------------------------------------------------

# 9. Acceptance Criteria

Die Implementierung ist für Version 1 abgeschlossen, wenn mindestens
folgende Testfälle korrekt behandelt werden:

### Test 1 -- bestehendes gültiges XML

Ein bisher funktionierender SEMP-Response wird geprüft.

**Erwartung:**

``` text
keine Validation-Meldung
```

### Test 2 -- leeres optionales Element

``` xml
<MinPowerConsumption/>
```

**Erwartung:**

``` text
EMPTY_VALUE
```

### Test 3 -- leeres Identification-Feld

``` xml
<DeviceVendor/>
```

**Erwartung:**

``` text
EMPTY_VALUE / MISSING_IDENTIFICATION
```

Die Ausgabe soll das betroffene Gerät soweit möglich identifizieren.

### Test 4 -- kein PlanningRequest

Der SEMP-Response enthält für ein Gerät keinen `PlanningRequest`.

**Erwartung:**

``` text
keine Validation-Meldung
```

### Test 5 -- PlanningRequest ohne Timeframe

``` xml
<PlanningRequest/>
```

**Erwartung:**

``` text
EMPTY_PLANNING_REQUEST
```

### Test 6 -- unvollständiger Timeframe

Beispiel:

``` xml
<Timeframe>
    <DeviceId>F-23906479-000000000001-01</DeviceId>
</Timeframe>
```

**Erwartung:**

``` text
INCOMPLETE_TIMEFRAME
Missing: EarliestStart, LatestEnd, MaxRunningTime
```

### Test 7 -- ungültiges Zeitfenster

``` text
EarliestStart >= LatestEnd
```

**Erwartung:**

``` text
INVALID_RANGE
```

### Test 8 -- ungültiges Min/Max-Paar

Beispiel:

``` text
MinRunningTime = 7200
MaxRunningTime = 3600
```

**Erwartung:**

``` text
INVALID_RANGE
```

### Test 9 -- nur ein optionaler Min/Max-Parameter vorhanden

Beispiel:

``` xml
<MinOnTime>60</MinOnTime>
```

`MaxOnTime` fehlt.

**Erwartung:**

``` text
keine Validation-Meldung aufgrund des fehlenden MaxOnTime
```

------------------------------------------------------------------------

# 10. Abgrenzung

Nicht Bestandteil von Version 1 sind insbesondere:

-   vollständige XSD-Validierung,
-   vollständige Umsetzung aller SEMP-Protokollregeln,
-   automatische Reparatur von XML,
-   automatische Ergänzung fehlender optionaler Werte,
-   komplexe Prüfung von Timestamp-Semantik,
-   Prüfung auf überlappende Timeframes,
-   Validierung aller gerätespezifischen SEMP Application Notes,
-   Blockieren einer als fehlerhaft erkannten Nachricht.

Diese Funktionen können später ergänzt werden, wenn reale Fehlerfälle
zeigen, dass sie benötigt werden.

------------------------------------------------------------------------

## Leitprinzip

> **Der Validator soll die Fehlersuche vereinfachen und darf nicht
> selbst zum nächsten Problem werden.**

Neue Regeln sollen deshalb nur aufgenommen werden, wenn sie einen realen
Fehlerfall abdecken oder durch die verwendete SEMP-Spezifikation
ausreichend eindeutig begründet sind.
