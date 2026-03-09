Creep.prototype.sayHello = function sayHello() {
    this.say("Hello", true);
}
Creep.prototype.findEnergySource = function() {
	const sources = this.room.find(FIND_SOURCES);
	if (sources.length) {
		this.memory.source = sources[0].id;
		return sources[0];
	}
};
Creep.prototype.findEnergySourceMiner = function() {
    const sources = this.room.find(FIND_SOURCES);

    // Get all sourceIds currently used by harvesters
    const usedSources = _.map(
        _.filter(Game.creeps, c => c.memory.role === 'harvester' && c.memory.sourceId),
        c => c.memory.sourceId
    );

    // Find a source not already assigned
    const freeSource = _.find(sources, s => !usedSources.includes(s.id));

    if (freeSource) {
        this.memory.sourceId = freeSource.id;
        return freeSource;
    }

    return null;
};
Creep.prototype.moveToRoom = function moveToRoom(roomName) {
	this.moveTo(new RoomPosition(25, 25, roomName));
}
Creep.prototype.harvestEnergy = function harvestEnergy() {
	let storedSource = Game.getObjectById(this.memory.source);
	
	if (!storedSource || (!storedSource.pos.getOpenPositions().length && !this.pos.isNearTo(storedSource))) {
		delete this.memory.source;
		storedSource = this.findEnergySource();
	} 
	if (storedSource) {
		if (this.pos.isNearTo(storedSource)) {
			this.harvest(storedSource);
		} else {
			this.moveTo(storedSource);
		}
	}
}
Creep.prototype.harvestEnergyMiner = function harvestEnergyMiner() {
	let storedSource = Game.getObjectById(this.memory.source);
	
	if (!storedSource) {
		delete this.memory.source;
		storedSource = this.findEnergySourceMiner();
	} 
	if (storedSource) {
		if (this.pos.isNearTo(storedSource)) {
			this.harvest(storedSource);
		} else {
			this.moveTo(storedSource);
		}
	}
}
//change to work with defcon once added
Creep.prototype.getEnergyHaulTarget = function(roomState = "normal") {
	let priorityTables = {
		normal: {
			STRUCTURE_SPAWN: 1,
			STRUCTURE_EXTENSION: 1,
			STRUCTURE_TOWER: 2,
			STRUCTURE_CONTAINER: 3,
			STRUCTURE_STORAGE: 4,
			STRUCTURE_LAB: 5
		},
		underAttack: {
			STRUCTURE_SPAWN: 1,
			STRUCTURE_EXTENSION: 2,
			STRUCTURE_TOWER: 1,
			STRUCTURE_CONTAINER: 3,
			STRUCTURE_STORAGE: 4,
			STRUCTURE_LAB: 5
		},
		porter: {
			STRUCTURE_SPAWN: 2,
			STRUCTURE_EXTENSION: 2,
			STRUCTURE_TOWER: 3,
			STRUCTURE_CONTAINER: 2,
			STRUCTURE_STORAGE: 1,
			STRUCTURE_LAB: 3
		}
	};
    const table = priorityTables[roomState] || priorityTables.normal;

    let targets = this.room.find(FIND_MY_STRUCTURES).filter(s => {
        return s.store && s.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
    });

    if (targets.length === 0) return null;

    targets.sort((a, b) => {
        let priorityDiff = (table[a.structureType] || 99) - (table[b.structureType] || 99);
        if (priorityDiff !== 0) return priorityDiff;
        return this.pos.getRangeTo(a) - this.pos.getRangeTo(b);
    });

    return targets[0];
};
Creep.prototype.getEnergyTarget = function (sourceContainers = null) {
    let target = Game.getObjectById(this.memory.energyTarget);
    if (target) {
        let hasEnergy = false;
        if (target.store) {
            hasEnergy = target.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        } else if (target.amount) {
            hasEnergy = target.amount > 0;
        }

        if (hasEnergy) {
            if (target.store) {
                if (this.withdraw(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    this.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            } else {
                if (this.pickup(target) === ERR_NOT_IN_RANGE) {
                    this.moveTo(target, { visualizePathStyle: { stroke: '#ffaa00' } });
                }
            }
            return target; // keep using the stored target
        } else {
            delete this.memory.energyTarget;
            target = null;
        }
    }

    //If no stored target, pick a new one
    if (sourceContainers && sourceContainers.length > 0) {
        const richest = _.max(sourceContainers, c => c.store.getUsedCapacity(RESOURCE_ENERGY));
        if (richest && richest.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            this.memory.energyTarget = richest.id;
            if (this.withdraw(richest, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                this.moveTo(richest, { visualizePathStyle: { stroke: '#ffaa00' } });
            }
            return richest;
        }
    }

    //Check for dropped energy
    const dropped = this.room.find(FIND_DROPPED_RESOURCES, {
        filter: r => r.resourceType === RESOURCE_ENERGY
    });
    if (dropped.length > 0) {
        const richestDrop = _.max(dropped, r => r.amount);
        this.memory.energyTarget = richestDrop.id;
        if (this.pickup(richestDrop) === ERR_NOT_IN_RANGE) {
            this.moveTo(richestDrop, { visualizePathStyle: { stroke: '#ffaa00' } });
        }
        return richestDrop;
    }

    delete this.memory.energyTarget;
    return null;
};