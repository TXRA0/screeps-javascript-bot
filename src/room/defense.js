function towerDefense(room) {
    const towers = room.find(FIND_MY_STRUCTURES)
        .filter(s => s.structureType === STRUCTURE_TOWER);

    towers.forEach(tower => {

        const closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
        if (closestHostile) {
            tower.attack(closestHostile);
            return;
        }

        const closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
            filter: structure => {
                if (structure.structureType === STRUCTURE_WALL) return false;

                if (structure.structureType === STRUCTURE_RAMPART) {
                    return structure.hits < 50000;
                }

                return structure.hits < structure.hitsMax;
            }
        });

        if (closestDamagedStructure) {
            tower.repair(closestDamagedStructure);
            return;
        }

        // 3. Heal creeps
        const damagedCreeps = tower.room.find(FIND_MY_CREEPS)
            .filter(c => c.hits < c.hitsMax);

        if (damagedCreeps.length > 0) {
            const closest = tower.pos.findClosestByRange(damagedCreeps);
            tower.heal(closest);
        }
    });
}

module.exports = towerDefense;