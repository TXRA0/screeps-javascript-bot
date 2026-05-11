const screepsProfiler = require("../screeps-profiler")
const config = require('../config')

var remoteHauler = {

    run: function(creep) {

        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }

        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
            delete creep.memory.energyTarget;
            delete creep.memory.target;
        }

        if (creep.memory.working) {
			//efficient? idk
			if (creep.room.name === creep.memory.remoteRoom) {
				let builder = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
					filter: c =>
						c.memory.role === 'remoteBuilder' &&
						c.store.getFreeCapacity(RESOURCE_ENERGY) > 0
				});

				if (builder) {

					if (creep.transfer(builder, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
						creep.moveTo(builder);
					}

					return;
				}
			}

            if (creep.room.name !== creep.memory.homeRoom) {
                creep.moveToRoom(creep.memory.homeRoom);
                return;
            }

            let target = Game.getObjectById(creep.memory.target);

            if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {

                target = creep.getEnergyHaulTargetRemote();

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
            }

        } else {

            if (creep.room.name !== creep.memory.remoteRoom) {
                creep.moveToRoom(creep.memory.remoteRoom);
                return;
            }

            creep.getEnergyTarget();
        }
    },

	getBody: function(homeRoom, remoteRoomName) {
		const mem = Memory.rooms[remoteRoomName] || {};
		const roadsBuilt = mem.roadsBuilt === true;

		console.log(remoteRoomName, roadsBuilt);

		let segment = roadsBuilt
			? [CARRY, CARRY, MOVE]
			: [CARRY, MOVE];

		let harvesters = _.filter(
			Game.creeps,
			c => c.memory.role === 'harvester' && c.room.name === homeRoom.name
		);

		let energyAvailable = harvesters.length
			? homeRoom.energyCapacityAvailable
			: homeRoom.energyAvailable;

		let segmentCost = _.sum(segment, p => BODYPART_COST[p]);

		let maxSegments = Math.max(1, Math.floor(energyAvailable / segmentCost));
		maxSegments = roadsBuilt
			? Math.min(maxSegments, 16)
			: Math.min(maxSegments, 25);

		let body = [];
		for (let i = 0; i < maxSegments; i++) {
			body.push(...segment);
		}

		return body;
	},

    getSpawnData: function(room) {
        return {
            name: "RemoteHauler" + Game.time,
            memory: {
                role: 'remoteHauler',
                homeRoom: room.name,
                working: false
            }
        };
    }
};
if (config.test.profiler) {
  screepsProfiler.registerObject(remoteHauler, "remoteHauler")
}
module.exports = remoteHauler;
