#!/usr/bin/env node

/* jshint esversion: 6, undef: true, unused: true, laxcomma: true */

/*
 *
 * To use this: npm install mqtt async doorbot
 *
 */

const RingAPI = require('.');
const yaml = require('js-yaml')
const fs = require('fs')
fs.writeFile('mqtt.yaml','',function(err){});
var security_panel_zid = ''
var location_id = ''

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
			const configs_topic = 'homeassistant/binary_sensor/alarm/status/config';
			const messages = { name	: 'Alarm Status'
					, device_class : 'connectivity'
					, off_delay: 15
					};
		  const sensor = {'binary_sensor connection': {
				    platform: 'mqtt',
						state_topic: 'homeassistant/binary_sensor/alarm/status/state',
			      name	: messages.name,
					  device_class : messages.device_class,
					  off_delay: messages.off_delay }};
      console.log(yaml.dump(sensor));
      fs.appendFile('mqtt.yaml',yaml.dump(sensor),function(err){});
      message.body.forEach((device) => {
				var sensor_name = device.general.v2.zid
				if (device.general.v2.deviceType === 'sensor.motion') {
					const config_topic = 'homeassistant/binary_sensor/alarm/'+sensor_name+'/config';
					const message = { name	: device.general.v2.name
							, device_class : 'motion'
							};
					console.log(JSON.stringify(message));
					const state_topic = 'homeassistant/binary_sensor/alarm/'+sensor_name+'/state';
					const status = device.device.v1.faulted ? 'ON' : 'OFF';
          const sensor = {['binary_sensor '+message.name]: {platform: 'mqtt', name: message.name, device_class : message.device_class, state_topic: state_topic}}
					console.log(yaml.dump(sensor))
					fs.appendFile('mqtt.yaml',yaml.dump(sensor),function(err){})
				}
				if (device.general.v2.deviceType === 'sensor.contact') {
					const topic = 'homeassistant/binary_sensor/alarm/'+sensor_name+'/config';
					const message = { name	: device.general.v2.name
							, device_class : 'door'
							};
					console.log(JSON.stringify(message));
					const state_topic = 'homeassistant/binary_sensor/alarm/'+sensor_name+'/state';
					const sensor = {['binary_sensor '+message.name] : {platform: 'mqtt', name: message.name, device_class : message.device_class, state_topic: state_topic}}
					console.log(yaml.dump(sensor))
					fs.appendFile('mqtt.yaml',yaml.dump(sensor),function(err){})
				}
				if (device.general.v2.deviceType === 'security-panel') {
					security_panel_zid = sensor_name;
					const message = { name  : device.general.v2.name
							, state_topic : 'home/alarm/state'
							, command_topic : 'home/alarm/command'
							};
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
					const sensor = {['alarm_control_panel '+message.name] :
						{
							platform: 'mqtt',
						  name: message.name,
						  state_topic: message.state_topic,
						  command_topic: message.command_topic
					  }
				  }
          console.log(yaml.dump(sensor));
          fs.appendFile('mqtt.yaml',yaml.dump(sensor),function(err){});
				}

  	   });
    });
	});
 });
}

alarmContact();
