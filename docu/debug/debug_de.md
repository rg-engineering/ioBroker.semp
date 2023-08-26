# Debug-Möglichkeiten



## ioBroker log

Die einfachste Möglichkeit, Fehler und Informationen über den Adapter zu finden, ist das debug log.
Dazu zunächts die Protokollstufe des Adapters auf debug stellen, den Adapter neu starten.

![Bild1](ioB_Log_1_de.PNG)

oder

![Bild2](ioB_Log_2_de.PNG)

Unter Protokolle findet man dann die logs. Der Filter hilft, die logs des Adapters zu finden.

![Bild3](ioB_Log_3_de.PNG)

Hier kann man auch das gesamte log als Textdatei herunterladen.

Wenn man noch die erweiterte Protokollierung aktiviert, wird jedes Telegram an den Homemanager zusätzlich im log
protokolliert. Das führt aber zu extrem umfangreichen logs und sollte nur kurzzeitig zur Fehlersuche aktiviert werden.

![Bild5](ioB_Log_5_de.PNG)


## csv Log
Da die ioBroker-logs sehr umfangreich sein können, hat dieser Adapter eine weitere Möglichkeit, die Daten,
die an den Homemanager gesendet wurden, zu loggen.

Dazu muss man das csv-Log aktivieren und einen Pfad angeben, wo das log gespeichert werden soll. Wenn nur ein Pfad 
angegeben wird, wird eine log-Datei pro Tag im angegebenen Pfad erzeugt. Die Datei wird nach 5 Tagen wieder gelöscht, so dass nur maximal
5 csv-logs im Pfad liegen. Wenn man einen Dateinamen mit angibt, wird in diese Datei geloggt.

**Achtung**: der Pfad muss auf dem System lokal erreichbar sein, auf dem die semp-Instanz läuft.

![Bild4](ioB_Log_4_de.PNG)

## SHM log

Der Homemanager erstellt ebenfalls logs. Die sind nicht ganz so einfach zu finden, helfen
aber oft, wenn oben genannte logs nicht mehr ausreichen.

siehe [Connection Assist](../connection_assist/connection_assist_de.md)
