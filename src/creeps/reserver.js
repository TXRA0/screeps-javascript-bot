const screepsProfiler = require("../screeps-profiler")
const config = require('../config')

var reserver = {

    /** @param {Creep} creep **/
	run: function(creep) {
		creep.reserve()
	},

    request: function(room) {
        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'reserver')) {
            room.memory.spawnQueue.push({
                role: "reserver",
                priority: 6
            });
        }

    },

	getBody: function(room) {
		return [CLAIM, MOVE];
	},

    getSpawnData: function(room) {
        return {
            name: "Reserver" + Game.time,
            memory: {
                role: "reserver",
                homeRoom: room.name,
            }
        };
    }
};
if (config.test.profiler) {
  screepsProfiler.registerObject(reserver, "reserver")
}
module.exports = reserver;