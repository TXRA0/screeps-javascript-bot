const screepsProfiler = require("../screeps-profiler");
const config = require("../config");
const common = require('../utils/common')

var roleRemoteJanitor = {

    run: function (creep) {

        if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
        }

        if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
            creep.memory.working = true;
        }

        if (creep.memory.working) {

            if (creep.room.name !== creep.memory.remoteRoom) {
                creep.moveToRoom(creep.memory.remoteRoom);
                return;
            }

            let targetSite = Game.getObjectById(creep.memory.targetSite);

			if (!targetSite || targetSite.hits >= targetSite.hitsMax) {

				creep.memory.targetSite = undefined;

				targetSite = roleRemoteJanitor.findNewRepairSite(creep);

				if (!targetSite) {
					const memRoom = Memory.rooms[creep.memory.remoteRoom];

					if (memRoom && memRoom.roads) {
						for (let id of memRoom.roads) {
							const road = Game.getObjectById(id);
							if (road && road.hits < road.hitsMax) {
								creep.memory.targetSite = road.id;
								targetSite = road;
								break;
							}
						}
					}
				}
			}

            if (targetSite instanceof Structure) {

                let isBorder =
                    creep.pos.x === 0 ||
                    creep.pos.x === 49 ||
                    creep.pos.y === 0 ||
                    creep.pos.y === 49;

                if (
                    creep.pos.roomName !== targetSite.pos.roomName ||
                    isBorder ||
                    creep.pos.getRangeTo(targetSite) > 3
                ) {

                    roleRemoteJanitor.repairRoadsCloseby(creep);
                    creep.travelTo(targetSite, { range: 3 });

                } else {
                    creep.repair(targetSite);
                }
            } else {
				common.moveOffRoad(creep)
			}

        } else {

            if (creep.room.name !== creep.memory.homeRoom) {
                creep.moveToRoom(creep.memory.homeRoom);
                return;
            }

            creep.getEnergyTargetOther();
        }
    },

    getBody: function (room) {

        let segment = [CARRY, CARRY, MOVE, WORK];

        let harvesters = _.filter(
            Game.creeps,
            c => c.memory.role === "harvester" &&
                 c.room.name === room.name
        );

        let energyAvailable = harvesters.length
            ? room.energyCapacityAvailable
            : room.energyAvailable;

        let segmentCost = _.sum(segment, p => BODYPART_COST[p]);

        let maxSegments = Math.max(
            1,
            Math.floor(energyAvailable / segmentCost)
        );

        maxSegments = Math.min(maxSegments, 12);

        let body = [];

        for (let i = 0; i < maxSegments; i++) {
            body.push(...segment);
        }

        return body;
    },

    getSpawnData: function (room) {

        return {
            name: "Remote_Janitor" + Game.time,
            memory: {
                role: "remoteJanitor",
                homeRoom: room.name,
                remoteRoom: undefined,
                targetSite: undefined,
                working: false
            }
        };
    },

    findNewRepairSite: function (creep) {

        let remoteRoom = Game.rooms[creep.memory.remoteRoom];

        if (!remoteRoom) {
            return null;
        }

        let structure = roleRemoteJanitor.getMostDamagedStructure(remoteRoom);

        if (structure) {
            creep.memory.targetSite = structure.id;
            return structure;
        }

        creep.memory.targetSite = undefined;

        return null;
    },

    getMostDamagedStructure: function (room) {

        let outpostRoads = room.memory.roads;

        if (!outpostRoads || outpostRoads.length === 0) {
            return undefined;
        }

        let mostInNeed = undefined;

        for (let roadId of outpostRoads) {

            let road = Game.getObjectById(roadId);

            if (road instanceof StructureRoad) {

                let damage = road.hitsMax - road.hits;

                if (damage > 3000) {

                    if (!mostInNeed) {
                        mostInNeed = road;
                    } else {

                        let currentDamage =
                            mostInNeed.hitsMax - mostInNeed.hits;

                        if (damage > currentDamage) {
                            mostInNeed = road;
                        }
                    }
                }
            }
        }

        return mostInNeed;
    },

    repairRoadsCloseby: function (creep) {

        let structures = creep.pos.lookFor(LOOK_STRUCTURES);

        for (let s of structures) {

            if (
                s.structureType === STRUCTURE_ROAD &&
                s.hitsMax - s.hits > 500
            ) {
                creep.repair(s);
            }
        }
    }
};

if (config.test.profiler) {
    screepsProfiler.registerObject(roleRemoteJanitor, "roleRemoteJanitor");
}

module.exports = roleRemoteJanitor;