
# Connection Assist

## Einleitung

Mit dem Connection Assist von SHM kann man die log files vom HomeMamager (und anderen SMA - Ger�ten) downloaden.
F�r die Fehlersuche k�nnen diese log files hilfreich sein


## Herunterladen der log Files

* Kopieren des "SMA Connection Assist" von  [connection-assist.jar](https://github.com/rg-engineering/ioBroker.semp/tree/master/docu/SMA/connection-assist.jar) auf den Windows-PC und irgendwohin speichern
* dann eine Eingabe aufforderung �ffnen, ich das Verzeichnis wechseln, wo die jar-datei gespeichert wurde und 

```
connection-assist.jar -discoverHoman
```

aufrufen.
![Bild1](connection_assist_1.PNG)
* das �ffnet ein Browser-Fenster
* die SMA Ger�te werden gesucht
![Bild2](connection_assist_2.PNG)
* den SHM ausw�hlen und verbinden
* als Passwort den RID eingeben (SHM2)
![Bild3](connection_assist_3.PNG)
* Systemstatus speichern
![Bild4](connection_assist_4.PNG)
![Bild4_1](connection_assist_4_1.PNG)
* als smasl Datei speichern und nach zip umbenenennen (Achtung! Pfad merken, wohin gespeichert wurde)
![Bild5](connection_assist_5.PNG)
* SEMPLog.tgz entpacken
* es sind 5 logs der letzten 5 Stunden enthalten