var reserver = {

    /** @param {Creep} creep **/
	run: function(creep) {
		creep.reserve()
	},
	spawn: function(room) {
		let reserverTarget = 2; //scouting should take into account room source amount
		let flag = _.find(Game.flags, f => f.name.startsWith("remoteRoom_"));

		if (!flag) return;

		let flagRoomName = flag.name.split("_")[1];
		
		if (room.name !== flagRoomName) return;

		let reservers = _.filter(
			Game.creeps,
			c => c.memory.role === 'reserver' && c.memory.homeRoom === room.name
		);

		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'reserver').length;

		if (reservers.length + queued < reserverTarget) {
			this.request(room);
		}
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

module.exports = reserver;