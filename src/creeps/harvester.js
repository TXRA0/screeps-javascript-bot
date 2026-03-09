var harvester = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.working = false;
            creep.say('🔄 harvest');
        }
        if(!creep.memory.working && creep.store.getFreeCapacity() == 0) {
            creep.memory.working = true;
            creep.say('🚧 filling');
        }
		var haulers = _.filter(Game.creeps, (c) => c.memory.role == 'hauler' && c.room.name == creep.room.name);
		if (!haulers.length) {
			if(creep.memory.working) {
				var targets = creep.room.find(FIND_MY_STRUCTURES);
				targets = _.filter(targets, function(struct){
					return (struct.structureType == STRUCTURE_TOWER || struct.structureType == STRUCTURE_EXTENSION || struct.structureType == STRUCTURE_SPAWN) && struct.store.getFreeCapacity(RESOURCE_ENERGY);
				})
				if(targets.length) {
					let target = creep.pos.findClosestByRange(targets);

					if(creep.pos.isNearTo(target)) {
						creep.transfer(target, RESOURCE_ENERGY);
					} else {
						creep.moveTo(target);
					}
				}
			}
			else {
				creep.harvestEnergy();
			}
		} else {
			creep.harvestEnergyMiner();
		}
    },
    spawn: function(room) {
        var harvesters = _.filter(Game.creeps, (creep) => creep.memory.role == 'harvester' && creep.room.name == room.name);
        console.log('Harvesters: ' + harvesters.length, room.name);
		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'harvester').length;

        if (harvesters.length + queued < 2) {
            this.request(room);
        }
    },

    request: function(room) {
        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'harvester')) {
            room.memory.spawnQueue.push({
                role: "harvester",
                priority: 1
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
            name: "Harvester" + Game.time,
            memory: {
                role: "harvester",
                homeRoom: room.name,
            }
        };
    }
};

module.exports = harvester;