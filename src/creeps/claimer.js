var claimer = {

    /** @param {Creep} creep **/
    run: function(creep) {
		creep.claim()
    },
    spawn: function(room) {
        var claimers = _.filter(Game.creeps, (creep) => creep.memory.role == 'claimer' && creep.memory.homeRoom == room.name);
		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'claimer').length;
		var flag = Game.flags.claimRoom

        if (claimers.length + queued < 1 && flag) {
            this.request(room);
        }
    },

    request: function(room) {
        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'claimer')) {
            room.memory.spawnQueue.push({
                role: "claimer",
                priority: 8
            });
        }

    },

	getBody: function(room) {
		return [CLAIM, MOVE];
	},

    getSpawnData: function(room) {
        return {
            name: "Claimer" + Game.time,
            memory: {
                role: "claimer",
                homeRoom: room.name,
            }
        };
    }
};

module.exports = claimer;