const screepsProfiler = require("../screeps-profiler")
const config = require('../config')

var mineralMiner = {

    /** @param {Creep} creep **/
    run: function(creep) {

        function isCarryingMinerals(creep) {
            return Object.keys(creep.store).some(resource =>
                resource !== RESOURCE_ENERGY && creep.store[resource] > 0
            );
        }

        function hasFreeCapacityForMinerals(creep) {
            return creep.store.getFreeCapacity() > 0;
        }

        if (isCarryingMinerals(creep) && !hasFreeCapacityForMinerals(creep)) {
            creep.memory.working = true;
        } else if (creep.store.getUsedCapacity() === 0) {
            creep.memory.working = false;
        }

        if (creep.memory.working) {
            const terminal = creep.room.terminal;
            if (terminal) {
                for (const resource in creep.store) {
                    if (resource !== RESOURCE_ENERGY && creep.store[resource] > 0) {
                        if (creep.transfer(terminal, resource) === ERR_NOT_IN_RANGE) {
                            creep.moveTo(terminal);
                        }
                        break;
                    }
                }
            }
            return;
        }
		creep.mineralMiner()
    },

	spawn: function(room) {
		if (!room.controller || room.controller.level < 6) return;

		const extractor = room.find(FIND_STRUCTURES, {
			filter: s => s.structureType === STRUCTURE_EXTRACTOR
		})[0];

		if (!extractor) return;

		const mineralMiners = _.filter(
			Game.creeps,
			c => c.memory.role == 'mineralMiner' && c.room.name == room.name
		);

		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'mineralMiner').length;

		if (mineralMiners.length + queued < 1) {
			this.request(room);
		}
	},

    request: function(room) {
        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if (!room.memory.spawnQueue.find(r => r.role === 'mineralMiner')) {
            room.memory.spawnQueue.push({
                role: "mineralMiner",
                priority: 7
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
        maxSegments = Math.min(maxSegments, 10);

        let body = [];
        for (let i = 0; i < maxSegments; i++) {
            body.push(...segment);
        }

        return body;
    },

    getSpawnData: function(room) {
        return {
            name: "Mineral_Miner" + Game.time,
            memory: {
                role: 'mineralMiner',
                homeRoom: room.name,
                working: false,
                targetRoom: room.name
            }
        };
    },
};
if (config.test.profiler) {
  screepsProfiler.registerObject(mineralMiner, "mineraLMiner")
}
module.exports = mineralMiner;