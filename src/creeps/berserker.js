var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {
		creep.berserker()
    },

    spawn: function(room) {
        let berserkerTarget = 1
		let flag = Game.flags.trio

        let berserkers = _.filter(
            Game.creeps,
            c => c.memory.role === 'berserker' && c.memory.homeRoom === room.name
        );
		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'berserker').length;

        if (berserkers.length + queued < berserkerTarget && flag) {
            this.request(room);
        }
    },

    request: function(room) {

        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'berserker')) {
            room.memory.spawnQueue.push({
                role: "berserker",
                priority: 8
            });
        }

    },

	getBody: function(room) {
		let segment = [MOVE, ATTACK];

		let harvesters = _.filter(
			Game.creeps,
			c => c.memory.role === 'harvester' && c.room.name === room.name
		);

		let energyAvailable = harvesters.length ? room.energyCapacityAvailable : room.energyAvailable;

		let segmentCost = _.sum(segment, p => BODYPART_COST[p]);

		let maxSegments = Math.max(1, Math.floor(energyAvailable / segmentCost));
		maxSegments = Math.min(maxSegments, 16);

		let body = [];
		for (let i = 0; i < maxSegments; i++) {
			body.push(...segment);
		}

		return body;
	},


    getSpawnData: function(room) {
        return {
            name: "Berserker" + Game.time,
            memory: {
                role: "berserker",
                homeRoom: room.name,
                working: false
            }
        };
    }
};

module.exports = roleBuilder;