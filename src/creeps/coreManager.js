const screepsProfiler = require("../screeps-profiler")
const config = require('../config')

var mineralMiner = {

    /** @param {Creep} creep **/
    run: function(creep) {
		creep.coreManager()
    },

	spawn: function(room) {
		if (!room.controller || room.controller.level < 6) return;

		const extractor = room.find(FIND_STRUCTURES, {
			filter: s => s.structureType === STRUCTURE_EXTRACTOR
		})[0];

		if (!extractor) return;

		const coreManagers = _.filter(
			Game.creeps,
			c => c.memory.role == 'coreManager' && c.room.name == room.name
		);

		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'coreManager').length;

		if (coreManagers.length + queued < 1) {
			this.request(room);
		}
	},

    request: function(room) {
        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if (!room.memory.spawnQueue.find(r => r.role === 'coreManager')) {
            room.memory.spawnQueue.push({
                role: "coreManager",
                priority: 7
            });
        }
    },

    getBody: function(room) {
        let segment = [MOVE, CARRY, CARRY, CARRY, CARRY,];

        let harvesters = _.filter(
            Game.creeps,
            c => c.memory.role === 'harvester' && c.room.name === room.name
        );

        let energyAvailable = harvesters.length ? room.energyCapacityAvailable : room.energyAvailable;

        let segmentCost = _.sum(segment, p => BODYPART_COST[p]);

        let maxSegments = Math.max(1, Math.floor(energyAvailable / segmentCost));
        maxSegments = Math.min(maxSegments, 10);

        let body = [];
        for (let i = 0; i < maxSegments; i++) {
            body.push(...segment);
        }

        return body;
    },

    getSpawnData: function(room) {
        return {
            name: "Core_Manager" + Game.time,
            memory: {
                role: 'coreManager',
                homeRoom: room.name,
                working: false,
                targetRoom: room.name
            }
        };
    },

};

module.exports = mineralMiner;