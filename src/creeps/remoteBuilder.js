const screepsProfiler = require("../screeps-profiler")
const config = require('../config')

var roleRemoteBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {
		if (creep.room.name !== creep.memory.remoteRoom) {
            creep.moveToRoom(creep.memory.remoteRoom);
            return;
        }
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.working = false;
            creep.say('🔄 harvest');
        }

        if(!creep.memory.working && creep.store.getFreeCapacity() == 0) {
            creep.memory.working = true;
            creep.say('🚧 build');
        }

        if(creep.memory.working) {
            creep.building(creep);
        }
        else {
            creep.getEnergyTarget();
        }
    },
	getBody: function(room, remoteRoom) {
		let segment = [WORK, CARRY, MOVE];

		let harvesters = _.filter(
			Game.creeps,
			c => c.memory.role === 'harvester' && c.room.name === room.name
		);

		let energyAvailable = harvesters.length
			? room.energyCapacityAvailable
			: room.energyAvailable;

		let segmentCost = _.sum(segment, p => BODYPART_COST[p]);

		let maxSegments = Math.max(
			1,
			Math.floor(energyAvailable / segmentCost)
		);

		maxSegments = Math.min(
			maxSegments,
			Math.floor(50 / segment.length)
		);

		let body = [];

		for (let i = 0; i < maxSegments; i++) {
			body.push(...segment);
		}

		return body;
	},


    getSpawnData: function(room) {
        return {
            name: "Remote_Builder" + Game.time,
            memory: {
                role: "remoteBuilder",
                homeRoom: room.name,
                working: false
            }
        };
    }

};
if (config.test.profiler) {
  screepsProfiler.registerObject(roleRemoteBuilder, "roleRemoteBuilder")
}
module.exports = roleRemoteBuilder;