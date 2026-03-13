var remoteHarvester = {

    /** @param {Creep} creep **/
	run: function(creep) {
		let flag = Game.flags[`remoteRoom_${creep.memory.homeRoom}`];

		if (!flag) {
			creep.say("huh");
			return;
		}

		if (creep.pos.roomName !== flag.pos.roomName) {
			creep.moveTo(flag, {
				visualizePathStyle: { stroke: '#ffaa00' },
				reusePath: 50,
				maxOps: 5000,
				maxRooms: 16
			});
			return;
		}

		creep.harvestEnergyMiner();
	},
	spawn: function(room) {
		let harvesterTarget = 2; //scouting should take into account room source amount
		let flag = _.find(Game.flags, f => f.name.startsWith("remoteRoom_"));

		if (!flag) return;

		let flagRoomName = flag.name.split("_")[1];
		
		if (room.name !== flagRoomName) return;

		let harvesters = _.filter(
			Game.creeps,
			c => c.memory.role === 'remoteHarvester' && c.memory.homeRoom === room.name
		);

		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'remoteHarvester').length;

		if (harvesters.length + queued < harvesterTarget) {
			this.request(room);
		}
	},

    request: function(room) {
        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'remoteHarvester')) {
            room.memory.spawnQueue.push({
                role: "remoteHarvester",
                priority: 4
            });
        }

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
                homeRoom: room.name,
            }
        };
    }
};

module.exports = remoteHarvester;