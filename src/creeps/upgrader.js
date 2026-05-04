const screepsProfiler = require("../screeps-profiler")
const config = require('../config')

var roleUpgrader = {
    run: function(creep) {
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            creep.say('🔄');
        }
        if(!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = true;
            creep.say('🚧');
        }

        if(creep.memory.working) {
			creep.upgrade(creep)
        } else {
			creep.getEnergyTargetOther();
        }
    },
	spawn: function(room) {
		let upgraderTarget = 1;

		let stored = 0;
		if (room.storage && room.storage.store && room.storage.store[RESOURCE_ENERGY]) {
			stored = room.storage.store[RESOURCE_ENERGY];
		}

		if (room.controller.level < 4) {
			upgraderTarget = 3;
		} else if (stored < 50000) {
			upgraderTarget = 1;
		} else if (stored < 100000) {
			upgraderTarget = 2;
		} else {
			upgraderTarget = 3;
		}
        let upgraders = _.filter(
            Game.creeps,
            c => c.memory.role === 'upgrader' && c.room.name === room.name
        );

        const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'upgrader').length;

        if (upgraders.length + queued < upgraderTarget) {
            this.request(room);
        }
    },

    request: function(room) {
        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'upgrader')) {
            room.memory.spawnQueue.push({
                role: "upgrader",
                priority: 5
            });
        }

    },

	getBody: function(room) {
		let segment = [WORK, WORK, CARRY, MOVE];

		let harvesters = _.filter(
			Game.creeps,
			c => c.memory.role === 'harvester' && c.room.name === room.name
		);

		let energyAvailable = harvesters.length ? room.energyCapacityAvailable : room.energyAvailable;

		let segmentCost = _.sum(segment, p => BODYPART_COST[p]);

		let maxSegments = Math.max(1, Math.floor(energyAvailable / segmentCost));
		maxSegments = Math.min(maxSegments, 12);

		let body = [];
		for (let i = 0; i < maxSegments; i++) {
			body.push(...segment);
		}

		return body;
	},


    getSpawnData: function(room) {
        return {
            name: "Upgrader" + Game.time,
            memory: {
                role: "upgrader",
                homeRoom: room.name,
                working: false
            }
        };
    }
};
if (config.test.profiler) {
  screepsProfiler.registerObject(roleUpgrader, "upgrader")
}
module.exports = roleUpgrader;