var roleUpgrader = {
    run: function(creep) {
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
            creep.memory.working = false;
            creep.say('🔄');
        }
        if(!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.working = true;
            creep.say('🚧');
        }

        if(creep.memory.working) {
			creep.upgrade(creep)
        } else {
			creep.getEnergyTargetOther();
        }
    },
	spawn: function(room) {
        let upgraderTarget = _.get(room.memory, ['census', 'upgrader'], 1);

        let upgraders = _.filter(
            Game.creeps,
            c => c.memory.role === 'upgrader' && c.room.name === room.name
        );

        const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'upgrader').length;

        if (upgraders.length + queued < upgraderTarget) {
            this.request(room);
        }
    },

    request: function(room) {
        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'upgrader')) {
            room.memory.spawnQueue.push({
                role: "upgrader",
                priority: 5
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
		maxSegments = Math.min(maxSegments, 16);

		let body = [];
		for (let i = 0; i < maxSegments; i++) {
			body.push(...segment);
		}

		return body;
	},


    getSpawnData: function(room) {
        return {
            name: "Upgrader" + Game.time,
            memory: {
                role: "upgrader",
                homeRoom: room.name,
                working: false
            }
        };
    }
};

module.exports = roleUpgrader;