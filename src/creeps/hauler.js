const screepsProfiler = require("../screeps-profiler")
const config = require('../config')

var hauler = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if (creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.working = false;
            creep.say('🔄 harvest');
        }

        if (!creep.memory.working && creep.store.getFreeCapacity() == 0) {
            creep.memory.working = true;
            creep.say('🚚 hauling');
            delete creep.memory.energyTarget;
            delete creep.memory.target;
        }

        if (creep.memory.working) {
            let target = Game.getObjectById(creep.memory.target);

            if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                target = creep.getEnergyHaulTarget();

                if (target) {
                    creep.memory.target = target.id;
                } else {
                    creep.memory.target = null;
                }
            }

            if (target) {
                if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                creep.say('sleep', true);
            }
        } else {
            creep.getEnergyTarget();
        }
    },

    spawn: function(room) {
        const haulers = _.filter(
            Game.creeps,
            c => c.memory.role == 'hauler' && c.room.name == room.name
        );

        const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'hauler').length;

        const neededHaulers = this.calculateNeededHaulers(room);

        if (haulers.length + queued < neededHaulers) {
            this.request(room);
        }
    },

    request: function(room) {
        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if (!room.memory.spawnQueue.find(r => r.role === 'hauler')) {
            room.memory.spawnQueue.push({
                role: "hauler",
                priority: 2
            });
        }
    },

	getBody: function(room) {
		let segment = [CARRY, MOVE];

		let harvesters = _.filter(
			Game.creeps,
			c => c.memory.role === 'harvester' && c.room.name === room.name
		);

		let energyAvailable = harvesters.length ? room.energyCapacityAvailable : room.energyAvailable;

		let segmentCost = _.sum(segment, p => BODYPART_COST[p]);

		let maxSegments = Math.max(1, Math.floor(energyAvailable / segmentCost));
		maxSegments = Math.min(maxSegments, 25);

		let body = [];
		for (let i = 0; i < maxSegments; i++) {
			body.push(...segment);
		}

		return body;
	},

    getSpawnData: function(room) {
        return {
            name: "Hauler" + Game.time,
            memory: {
                role: 'hauler',
                homeRoom: room.name,
                working: false,
                targetRoom: room.name
            }
        };
    },

    calculateNeededHaulers: function(room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return 0;

        let totalCarryPartsNeeded = 0;

        room.find(FIND_SOURCES).forEach(source => {
            const path = room.findPath(spawn.pos, source.pos, { ignoreCreeps: true });
            const carryParts = Math.ceil((path.length * 2 * 10) / 50);
            totalCarryPartsNeeded += carryParts;
        });

        const carryPerHauler = this.getBody(room).filter(p => p === CARRY).length || 1;

        return Math.ceil(totalCarryPartsNeeded / carryPerHauler);
    }
};
if (config.test.profiler) {
  screepsProfiler.registerObject(hauler, "hauler")
}
module.exports = hauler;