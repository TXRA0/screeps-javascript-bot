var porter = {

    /** @param {Creep} creep **/
    run: function(creep) {
			creep.say([
			"We rise",
			"as _TXR",
			"the empire",
			"the pure",
			"the strong",
			"the crown",
			"no mercy",
			"no doubt",
			"our will",
			"unchained",
			"shard 3",
			"is ours",
			"all else",
			"kneels"
		][Game.time % 14], true);
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.working = false;
            creep.say('🔄 harvest');
        }
        if(!creep.memory.working && creep.store.getFreeCapacity() == 0) {
            creep.memory.working = true;
            creep.say('🚧 filling');
        }

        if(creep.memory.working) {
			const target = creep.getEnergyHaulTargetPorter();
			if (target) {
				if (creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
					creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
				}
			} else {
				creep.say('sleep', true);
			}
        }
        else {
			creep.getEnergyTargetPorter();
        }
    },
    spawn: function(room) {
		if (room && room.controller && room.controller.level < 4 && !room.storage) {
			return;
		}
        const porters = _.filter(
            Game.creeps,
            c => c.memory.role == 'porter' && c.room.name == room.name
        );

        const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'porter').length;

        const neededPorters = 1


        if (porters.length + queued < neededPorters) {
            this.request(room);
        }
    },

    request: function(room) {
        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if (!room.memory.spawnQueue.find(r => r.role === 'porter')) {
            room.memory.spawnQueue.push({
                role: "porter",
                priority: 2
            });
        }
    },

	getBody: function(room) {
		let segment = [CARRY, CARRY, MOVE];

		let harvesters = _.filter(
			Game.creeps,
			c => c.memory.role === 'harvester' && c.room.name === room.name
		);

		let energyAvailable = harvesters.length ? room.energyCapacityAvailable : room.energyAvailable;

		let segmentCost = _.sum(segment, p => BODYPART_COST[p]);

		let maxSegments = Math.max(1, Math.floor(energyAvailable / segmentCost));
		maxSegments = Math.min(maxSegments, 12);

		let body = [];
		for (let i = 0; i < maxSegments; i++) {
			body.push(...segment);
		}

		return body;
	},

    getSpawnData: function(room) {
        return {
            name: "porter" + Game.time,
            memory: {
                role: 'porter',
                homeRoom: room.name,
                working: false,
                targetRoom: room.name
            }
        };
    },
};

module.exports = porter;