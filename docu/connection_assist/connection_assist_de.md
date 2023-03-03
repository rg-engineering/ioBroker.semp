
#Connection Assist

##Einleitung

Mit dem Connection Assist von SHM kann man die log files vom HomeMamager (und anderen SMA - Geräten) downloaden.
Für die Fehlersuche können diese log files hilfreich sein


##Herunterladen der log Files

* Kopieren des "SMA Connection Assist" von  [connection-assist.jar](https://github.com/rg-engineering/ioBroker.semp/tree/master/docu/SMA/connection-assist.jar) auf den Windows-PC und irgendwohin speichern
* dann eine Eingabe aufforderung öffnen, ich das Verzeichnis wechseln, wo die jar-datei gespeichert wurde und 

```
java connection-assist.jar -discoverHoman
```

aufrufen.
!(connection_assist_1.png)
* das öffnet ein Browser-Fenster
* die SMA Geräte werden gesucht
!(connection_assist_2.png)
* den SHM auswählen und verbinden
* als Passwort den RID eingeben (SHM2)
!(connection_assist_3.png)
* Systemstatus auslesen
!(connection_assist_4.png)
!(connection_assist_4_1.png)
* als smasl Datei speichern und nach zip umbenenennen (Achtung! Pfad merken, wohin gespeichert wurde)
!(connection_assist_5.png)
* SEMPLog.tgz entpacken
