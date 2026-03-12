function towerDefense(room) {
	//list towers
    var towers = room.find(FIND_MY_STRUCTURES, {
		filter: { structureType: STRUCTURE_TOWER }});
	if(towers.length) {
		_.forEach(towers, function(tower) {
			var closestHostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
			if(closestHostile) {
				tower.attack(closestHostile);
			}
			var closestDamagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
				filter: (structure) => structure.hits < structure.hitsMax && structure.structureType !== STRUCTURE_WALL
			});
			if(closestDamagedStructure) {
				tower.repair(closestDamagedStructure);
			}
		}) 
	}
}
//change to work with defcon once added

module.exports = towerDefense;