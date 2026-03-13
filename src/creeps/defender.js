var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {
        creep.defend(creep);
    },

    // decides if we need builders
    spawn: function(room) {
        let defenderTarget = 1
		//defconnnnn

        let defenders = _.filter(
            Game.creeps,
            c => c.memory.role === 'defender' && c.room.name === room.name
        );
		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'defender').length;

        let hostiles = room.find(FIND_HOSTILE_CREEPS);

        if (hostiles.length > 0 && defenders.length + queued < defenderTarget) {
            this.request(room);
        }
    },

    request: function(room) {

        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'defender')) {
            room.memory.spawnQueue.push({
                role: "defender",
                priority: 2
            });
        }

    },

	getBody: function(room) {
		let segment = [ATTACK, MOVE];

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
            name: "Defender" + Game.time,
            memory: {
                role: "defender",
                homeRoom: room.name,
                working: false
            }
        };
    }
};

module.exports = roleBuilder;