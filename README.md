Ring Alarm MQTT Alarm Panel Home Assistant Integration
=====================
This package is based on Dav Glass' [doorbot](https://github.com/davglass/doorbot) package, Homespun's ring-alarm fork (https://github.com/homespun/ring-alarm), various PRs from Joey Berkovitz (https://github.com/joeyberkovitz) and adapted to work with Home Assistant

This code is mostly derivative of the aforementioned repos.  I just added some extras around MQTT discovery with HA since I'm too much of a novice to rewrite this as a true HA plugin.

Installation/Usage
------------

* Clone this github
* npm install mqtt async ring-alarm
* Add your Ring credentials and MQTT broker address to mqttAlarm.sh
```
chmod a+x mqttAlarm.sh
./mqttAlarm.sh
```

## Features:
* Works with MQTT discovery in Home Assistant
* Automagically adds all your contact sensors, motion sensors, and alarm units as sensors in HA
* Updates contact/motion sensor status in real-time as long as mqttAlarm.js script is running
* Alarm panel reflects current alarm mode (based on updates received from Ring API)
* Set alarm mode directly from alarm sensor 
* Creates a connectivity sensor that monitors connection to Ring API.  Shows unavailable if no connectivity with API in last 15 seconds


# Recognition
Many thanks to [davglass](https://github.com/davglass) author of [doorbot](https://github.com/davglass/doorbot).

Many thanks (also) to [joeyberkovitz ](https://github.com/joeyberkovitz) who did most of the legwork on getting the Ring Alarm API connectivity to work.

Thanks also to [homespun](https://github.com/homespun) for updating doorbot with a basic, functional feature set for the Alarm API.
