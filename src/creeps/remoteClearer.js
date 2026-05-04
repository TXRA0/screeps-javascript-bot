const screepsProfiler = require("../screeps-profiler")
const config = require('../config')

var remoteClearer = {

    run: function(creep) {

        if (creep.room.name !== creep.memory.remoteRoom) {
            creep.moveToRoom(creep.memory.remoteRoom);
            return;
        }

        let hostile = creep.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
		let hostileStruc = creep.pos.findClosestByRange(FIND_HOSTILE_STRUCTURES);
        if (hostile) {
            if (creep.attack(hostile) === ERR_NOT_IN_RANGE) {
                creep.moveTo(hostile, { visualizePathStyle: { stroke: '#ff0000' } });
            }
            return;
        } else if (hostileStruc) {
            if (creep.attack(hostileStruc) === ERR_NOT_IN_RANGE) {
                creep.moveTo(hostileStruc, { visualizePathStyle: { stroke: '#ff0000' } });
            }
            return;
        }
    },
    getBody: function(room) {
        let segment = [ATTACK, MOVE];
        let segmentCost = BODYPART_COST[ATTACK] + BODYPART_COST[MOVE];

        let energyAvailable = room.energyCapacityAvailable;

        let maxSegments = Math.floor(energyAvailable / segmentCost);
        if (maxSegments < 1) maxSegments = 1;
        if (maxSegments > 25) maxSegments = 25;

        let body = [];
        for (let i = 0; i < maxSegments; i++) {
            body.push(ATTACK, MOVE);
        }

        return body;
    },

    getSpawnData: function(room) {
        return {
            name: "Remote_Clearer" + Game.time,
            memory: {
                role: "remoteClearer",
                homeRoom: room.name,
                working: false
            }
        };
    }
};
if (config.test.profiler) {
  screepsProfiler.registerObject(remoteClearer, "remoteClearer")
}
module.exports = remoteClearer;