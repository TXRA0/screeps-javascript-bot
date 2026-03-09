var hauler = {

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

		if (creep.memory.working) {
			let target = Game.getObjectById(creep.memory.target);

			if (!target || target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
				target = creep.getEnergyHaulTarget();

				if (target) {
					creep.memory.target = target.id;
				} else {
					creep.memory.target = null;
				}
			}
			if (target) {
				if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
					creep.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
				}
			} else {
				creep.say('sleep', true);
			}
		}
        else {
			creep.getEnergyTarget();
        }
    },
    // checks if the room needs to spawn a creep
	spawn: function(room) {
		var haulers = _.filter(Game.creeps, (creep) => creep.memory.role == 'hauler' && creep.room.name == room.name);
		var neededHaulers = this.calculateNeededHaulers(room)
		console.log('Haulers: ' + haulers.length, room.name);
		console.log('Needed Haulers: ' + neededHaulers, room.name);

		if (haulers.length < neededHaulers) {
			return true;
		}
		return false;
	},
    // returns an object with the data to spawn a new creep
    spawnData: function(room) {
            let name = 'Hauler' + Game.time;
            let body = [CARRY, MOVE];
			let targetRoom = room
            let memory = {role: 'hauler', targetRoom: targetRoom};
        
            return {name, body, memory};
    },
	calculateNeededHaulers: function(room) {
        const spawn = room.find(FIND_MY_SPAWNS)[0];
        if (!spawn) return 0;

        let totalCarryParts = 0;

        room.find(FIND_SOURCES).forEach(source => {
            const path = room.findPath(spawn.pos, source.pos, { ignoreCreeps: true });
            const carryPartsNeeded = Math.ceil((path.length * 2 * 10) / 50); 
            totalCarryParts += carryPartsNeeded;
        });
		var carryPartsPerHauler = getBody([CARRY, MOVE], room).filter(x => x==CARRY).length
        var carryPerHauler = carryPartsPerHauler;
		if(carryPerHauler == 0) {
			carryPerHauler += 1
		}
        return Math.ceil(totalCarryParts / carryPerHauler);
    },
};
function getBody(segment, room) {
    let body = [];
    let harvesters = _.filter(
        Game.creeps,
        c => c.memory.role === 'harvester' && c.room.name === room.name
    );
    let energyAvailable = harvesters.length ? room.energyCapacityAvailable : room.energyAvailable;
    let totalSegCost = _.sum(segment, part => BODYPART_COST[part]);

    if (energyAvailable < totalSegCost) {
        let minBody = [];
        for (let part of segment) {
            if (BODYPART_COST[part] <= energyAvailable) {
                minBody.push(part);
                energyAvailable -= BODYPART_COST[part];
            }
        }
        return minBody;
    }

    let maxSegments = Math.floor(energyAvailable / totalSegCost);

    for (let i = 0; i < maxSegments; i++) {
        body.push(...segment);
    }

    return body;
}
module.exports = hauler;