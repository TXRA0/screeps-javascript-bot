var roleWallBuilder = {
	run: function (creep,  toolbox) {

	if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
		creep.memory.working = true;
	}
	if (creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
		creep.memory.working = false;
	}

	if (creep.memory.working) {
		creep.wallBuild(creep)
		} else {
			creep.getEnergyTargetOther(creep);
		}
	},
	spawn: function(room) {
        let wBs = 1

        let wallBuilders = _.filter(
            Game.creeps,
            c => c.memory.role === 'wallBuilder' && c.room.name === room.name
        );
		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'wallBuilder').length;

        let walls = room.find(FIND_STRUCTURES).filter(s => s.structureType == STRUCTURE_WALL)

        if (walls.length > 0 && wallBuilders.length + queued < wBs) {
            this.request(room);
        }
    },

    request: function(room) {

        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'wallBuilder')) {
            room.memory.spawnQueue.push({
                role: "wallBuilder",
                priority: 6
            });
        }

    },

	getBody: function(room) {
		let segment = [WORK, CARRY, MOVE, MOVE];

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
            name: "WallBuilder" + Game.time,
            memory: {
                role: "wallBuilder",
                homeRoom: room.name,
                working: false
            }
        };
    }
}
module.exports = roleWallBuilder;