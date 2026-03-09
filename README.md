# Screeps Javascript bot

## Javascript bot

Basic AI for the game [**Screeps: World**](https://screeps.com/)  
Designed to work in any room, though currently only tested by myself.  
My profile is here: [**TXR**](https://screeps.com/a/#!/profile/_TXR)

---
##Current Version — 0.91: All good things come to an end
-Lack of good defense/defcon code resulted in my death
-Defenders were stupid - didn't prioritise creeps ATTACKING my spawn

##Next Version — 0.95
Strengthen defensive logic across all rooms
Trigger Safe Mode only when absolutely necessary
Refine DEFCON evaluation based on enemy creep capability, not just quantity
Avoid Safe Mode for low-threat swarms (e.g. 10 creeps with 1 attack part each)
Prioritize Safe Mode for high-threat creeps (e.g. 1 or 2 creeps with 50 body parts)
Factor in enemy healing and damage potential when calculating defender requirements and repairer count
If towers and defenders cannot outpace enemy healing or damage—regardless of repair support, activate safe mode
possibly refactor the whole DEFCON system, allow for dynamic defenders such as ATTACK and RANGED_ATTACK working together

##Next Version — 1.0: !!!
Boost making and lab technicians
Upgrader boosting and general creep boosting for efficiency
Smarter market manager
(if threat appears) Boosted attackers

##Roadmap — Future Features
Develop a room manager for dynamic creep selection and spawn request management
Refactor the utilities module for smarter, more advanced logic
Implement a spawn queue with dynamic creep body generation
Enhance tower behavior and overall defense mechanisms
