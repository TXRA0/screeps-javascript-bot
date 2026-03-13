var healer = {

    /** @param {Creep} creep **/
    run: function(creep) {
		creep.healer()
    },

    spawn: function(room) {
        let healerTarget = 1
		let flag = _.find(Game.flags, f => f.name.startsWith("trio_"));

		if (!flag) return;

		let flagRoomName = flag.name.split("_")[1];
		
		if (room.name !== flagRoomName) return;

        let healers = _.filter(
            Game.creeps,
            c => c.memory.role === 'healer' && c.memory.homeRoom === room.name
        );
		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'healer').length;

        if (healers.length + queued < healerTarget && flag) {
            this.request(room);
        }
    },

    request: function(room) {

        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'healer')) {
            room.memory.spawnQueue.push({
                role: "healer",
                priority: 7
            });
        }

    },

	getBody: function(room) {
		let segment = [MOVE, HEAL];

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
            name: "Healer" + Game.time,
            memory: {
                role: "healer",
                homeRoom: room.name,
                working: false
            }
        };
    }
};

module.exports = healer;