#!/usr/bin/env node

/* jshint esversion: 6, undef: true, unused: true, laxcomma: true */

/*
 *
 * To use this: npm install mqtt async doorbot
 *
 */

const RingAPI = require('.');
const mqtt = require('mqtt')
const client = mqtt.connect(process.env.MQTT);
var security_panel_zid = ''
var location_id = ''
const discovery = process.env.DISCOVERY;
console.log(discovery)
client.on('connect', function () {

	client.subscribe('homeassistant', function (err) {
		if (!err) {
			console.log('Connected to mqtt and subscribed to homeassistant channel');
			}
		})
	client.subscribe('home/alarm/#', function (err) {});
})


client.on('message', function(topic, message) {
	if (topic === 'home/alarm/command') {
		var alarm_mode = '';
		console.log(message.toString());
		switch (message.toString()) {
			case 'DISARM':
				alarm_mode = 'none';
				break;
			case 'ARM_HOME':
				alarm_mode = 'some';
				break;
			case 'ARM_AWAY':
				alarm_mode = 'all';
				break;
			default:
				break;
		}
		ring.stations((err, station) => {
			ring.setAlarmMode(station[0],security_panel_zid,alarm_mode,[],(oops) => {});
		})
	}
})

var ring = RingAPI({
  email: process.env.RING_USERNAME || 'abc@gmail.com',
  password: process.env.RING_PASSPHRASE || 'mypassword',
	retries: 1
});

function alarmContact() {
 ring.stations((err, stations) => {
  if (err) {
		console.log('Error at stations')
		return console.log(err);
  }
	location_id = stations[0].location_id;
	console.log(JSON.stringify(stations,null,2))
  stations.forEach((station)=> {
    ring.getAlarmDevices(station, (err, station, message) => {
			if (err) {
				console.log('error at getAlarmDevices')
				return console.log(JSON.stringify(err,null,2));
			}
			console.log(discovery);
			if (discovery == 'true'){
				const configs_topic = 'homeassistant/binary_sensor/alarm/status/config';
				const messages = { name	: 'Alarm Status'
						, device_class : 'connectivity'
						, off_delay: 15
						};
				client.publish(configs_topic, JSON.stringify(messages));
			}
			client.publish('homeassistant/binary_sensor/alarm/status/state','ON',{retain: true});
      message.body.forEach((device) => {
				var sensor_name = device.general.v2.zid
				if (device.general.v2.deviceType === 'sensor.motion') {
					if (discovery == 'true'){
						const config_topic = 'homeassistant/binary_sensor/alarm/'+sensor_name+'/config';
						const message = { name	: device.general.v2.name
								, device_class : 'motion'
								};
						console.log(JSON.stringify(message));
						client.publish(config_topic, JSON.stringify(message));
					}
					const state_topic = 'homeassistant/binary_sensor/alarm/'+sensor_name+'/state';
					const status = device.device.v1.faulted ? 'ON' : 'OFF';
					client.publish(state_topic,status,{retain: true});
				}
				if (device.general.v2.deviceType === 'sensor.contact') {
					if (discovery == 'true'){
						const topic = 'homeassistant/binary_sensor/alarm/'+sensor_name+'/config';
						const message = { name	: device.general.v2.name
								, device_class : 'door'
								};
						console.log(JSON.stringify(message));
						client.publish(topic, JSON.stringify(message));
					}
				}
				if (device.general.v2.deviceType === 'security-panel') {
					security_panel_zid = sensor_name;
					if (discovery == 'true'){
						const topic = 'homeassistant/alarm_control_panel/alarm/'+sensor_name+'/config';
						const message = { name  : device.general.v2.name
								, state_topic : 'home/alarm/state'
								, command_topic : 'home/alarm/command'
								};
						console.log(JSON.stringify(message));
						client.publish(topic, JSON.stringify(message));
					}
					var state = 'disarmed'
					switch (device.device.v1.mode) {
						case 'none':
							break;
						case 'some':
							state = 'armed_home';
							break;
						case 'all':
							state = 'armed_away';
							break;
						default:
							state = 'disarmed';
							break;
					}
					client.publish('home/alarm/state',state,{retain: true});
				}

  	   });
    });

		ring.setAlarmCallback(station, 'DataUpdate', (err, station, message) => {
			if (err) {
				console.log('error at setCallback');
				return console.log(JSON.stringify(err,null,2));
			}
				const body = message.body && message.body[0]
				, info = body && body.general && body.general.v2
				, context = body && body.context && body.context.v1 && body.context.v1.device && body.context.v1.device.v1
				, update = {};

				console.log('DataUpdate: errP=' + (!!err) + ' station=' + station.location_id + ' datatype=' + message.datatype);
				if (message.datatype === 'HubDisconnectionEventType') {
						console.log(JSON.stringify({ info, context, update: { statusActive: false } }, null, 2));
					}

				if (!(info && context && (message.datatype === 'DeviceInfoDocType'))) {
					return console.log('message=' + JSON.stringify(message, null, 2));
				}

				update.deviceId = info.zid;

				info.lastCommTime = new Date(info.lastCommTime).getTime();

				//Construct topic & message to post to MQTT

				var sensor_name = message.context.affectedEntityId;
				var topic = '';
				var status = '';
				if (info.deviceType === 'security-panel') {
					mode = message.body[0].device.v1.mode;
					topic = 'home/alarm/state';
					switch (mode) {
						case 'none':
							status = 'disarmed';
							break;
						case 'some':
							status = 'armed_home';
							break;
						case 'all':
							status = 'armed_away';
							break;
						default:
							status = '';
							break;
					}
					console.log(status);
					return client.publish(topic, status,{retain: true});
				}
				if (info.deviceType === 'sensor.contact') {
					update.faulted = context.faulted ? 'ON' : 'OFF';
					topic = 'homeassistant/binary_sensor/alarm/'+sensor_name+'/state';
					status = update.faulted;
					return client.publish(topic, status,{retain: true});
				};
				if (info.deviceType === 'sensor.motion') {
					update.faulted = context.faulted ? 'ON' : 'OFF';
					topic = 'homeassistant/binary_sensor/alarm/'+sensor_name+'/state';
					status = update.faulted;
					return client.publish(topic, status,{retain: true});
				};
				if (info.tamperStatus) update.statusTampered = (info.tamperStatus === 'ok') ? 'NOT_TAMPERED' : 'TAMPERED';

				client.publish(topic,status,{retain: true});
			});
  });
 });
}

alarmContact();

function checkSocket(){
	if (!ring.alarmSockets[location_id]){
		console.log('Socket is disconnected')
		ring.counter = 0;
		ring.authQueue = [];
		ring.authenticating = false;
		return alarmContact();
	}
	client.publish('homeassistant/binary_sensor/alarm/status/state','ON');
	console.log('Socket is connected')
}

setInterval(checkSocket,10000)
