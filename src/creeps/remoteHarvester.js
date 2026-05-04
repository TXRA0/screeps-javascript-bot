const screepsProfiler = require("../screeps-profiler")
const config = require('../config')

var remoteHarvester = {

    run: function(creep) {

        if (creep.room.name !== creep.memory.remoteRoom) {
            creep.moveToRoom(creep.memory.remoteRoom);
            return;
        }

        creep.harvestEnergyRemoteMiner();
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
        maxSegments = Math.min(maxSegments, 3);

        let body = [];

        for (let i = 0; i < maxSegments; i++) {
            body.push(...segment);
        }

        return body;
    },

    getSpawnData: function(room) {
        return {
            name: "Remote_Harvester" + Game.time,
            memory: {
                role: "remoteHarvester",
                homeRoom: room.name
            }
        };
    }
};
if (config.test.profiler) {
  screepsProfiler.registerObject(remoteHarvester, "remoteHarvester")
}
module.exports = remoteHarvester;
