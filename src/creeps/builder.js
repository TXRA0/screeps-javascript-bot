var roleBuilder = {

    /** @param {Creep} creep **/
    run: function(creep) {
        if(creep.memory.working && creep.store[RESOURCE_ENERGY] == 0) {
            creep.memory.working = false;
            creep.say('🔄 harvest');
        }

        if(!creep.memory.working && creep.store.getFreeCapacity() == 0) {
            creep.memory.working = true;
            creep.say('🚧 build');
        }

        if(creep.memory.working) {
            creep.building(creep);
        }
        else {
            creep.getEnergyTargetOther();
        }
    },

    // decides if we need builders
    spawn: function(room) {
        let builderTarget = _.get(room.memory, ['census', 'builder'], 2);

        let builders = _.filter(
            Game.creeps,
            c => c.memory.role === 'builder' && c.room.name === room.name
        );
		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'builder').length;

        let sites = room.find(FIND_CONSTRUCTION_SITES);

        if (sites.length > 0 && builders.length + queued < builderTarget) {
            this.request(room);
        }
    },

    request: function(room) {

        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'builder')) {
            room.memory.spawnQueue.push({
                role: "builder",
                priority: 5
            });
        }

    },

	getBody: function(room) {
		let segment = [WORK, CARRY, MOVE];

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
            name: "Builder" + Game.time,
            memory: {
                role: "builder",
                homeRoom: room.name,
                working: false
            }
        };
    }
};

module.exports = roleBuilder;