function towerDefense(room) {
	//list towers
	var towers = room.find(FIND_MY_STRUCTURES).filter(s => s.structureType === STRUCTURE_TOWER)

	towers.forEach(tower => {
		var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS)
		if (closestHostile) {
			tower.attack(closestHostile)
		} else {
			var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
				filter: structure => {
					if (structure.structureType === STRUCTURE_RAMPART) {
						return structure.hits < structure.hitsMax * 0.001
					}
					return false
				},
			})
		if (closestDamagedStructure) {
			tower.repair(closestDamagedStructure)
		} else {
			const damagedCreeps = tower.room.find(FIND_MY_CREEPS).filter(c => c.hits < c.hitsMax)
				if (damagedCreeps) {
				var closest = tower.pos.findClosestByRange(damagedCreeps)
				tower.heal(closest)
			}
		}
		}
	}) 
}
//change to work with defcon once added
module.exports = towerDefense;