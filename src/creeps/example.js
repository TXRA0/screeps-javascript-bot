var role = {

    /** @param {Creep} creep **/
    run: function(creep) {
    },
    spawn: function(room) {
    },

    request: function(room) {
    },

	getBody: function(room) {
		let segment = [];

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
            name: "Harvester" + Game.time,
            memory: {
                role: "harvester",
                homeRoom: room.name,
            }
        };
    }
};

module.exports = role;