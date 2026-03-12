var pioneer = {
	run: function (/** @type {any} */ creep, /** @type {any} */  /** @type {{ pioneer: (arg0: any) => void; }} */ toolbox, /** @type {any} */ ) {
		var flag = Game.flags.supportRoom
		if (!flag) {
			creep.say("huh")
			return;
		}
		if (creep.pos.roomName !== flag.pos.roomName) {
			creep.moveTo(flag, {
				reusePath: 50,
				maxOps: 5000,
				maxRooms: 16
			});
			return;
		}
		if (!creep.memory.working && creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
			creep.memory.working = true;
		}
		if (creep.memory.working && creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
			creep.memory.working = false;
		}
		if (creep.memory.working == false) {
			creep.harvestEnergyPioneer()
		} else if (creep.memory.working == true) {
			creep.building()
		}
	},
	spawn: function(room) {
        let pioneerTarget = 3
		let flag = Game.flags.supportRoom

        let pioneers = _.filter(
            Game.creeps,
            c => c.memory.role === 'pioneer' && c.memory.homeRoom === room.name
        );
		const queued = _.filter(room.memory.spawnQueue || [], r => r.role === 'pioneer').length;

        if (pioneers.length + queued < pioneerTarget && flag) {
            this.request(room);
        }
    },

    request: function(room) {

        room.memory.spawnQueue = room.memory.spawnQueue || [];

        if(!room.memory.spawnQueue.find(r => r.role === 'pioneer')) {
            room.memory.spawnQueue.push({
                role: "pioneer",
                priority: 8
            });
        }

    },

	getBody: function(room) {
		let segment = [WORK, WORK, CARRY, MOVE, MOVE, MOVE];

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
            name: "Pioneer" + Game.time,
            memory: {
                role: "pioneer",
                homeRoom: room.name,
                working: false
            }
        };
    }
}
module.exports = pioneer;