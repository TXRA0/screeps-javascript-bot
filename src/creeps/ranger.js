var ranger = {

    /** @param {Creep} creep **/
    run: function(creep) {
		creep.ranger()
    },

	spawn: function(room) {
		let rangerTarget = 1;
		let flag = _.find(Game.flags, f => f.name.startsWith("trio_"));

		if (!flag) return;

		let flagRoomName = flag.name.split("_")[1];
		
		if (room.name !== flagRoomName) return;

		let rangers = _.filter(
			Game.creeps,
			c => c.memory.role === 'ranger' && c.memory.homeRoom === room.name
		);

		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'ranger').length;

		if (rangers.length + queued < rangerTarget) {
			this.request(room);
		}
	},

    request: function(room) {

        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'ranger')) {
            room.memory.spawnQueue.push({
                role: "ranger",
                priority: 6
            });
        }

    },

	getBody: function(room) {
		let segment = [RANGED_ATTACK, MOVE];

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
            name: "Ranger" + Game.time,
            memory: {
                role: "ranger",
                homeRoom: room.name,
                working: false
            }
        };
    }
};

module.exports = ranger;