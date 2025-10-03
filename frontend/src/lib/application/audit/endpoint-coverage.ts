/**
 * Backend Endpoint Coverage Audit
 * 
 * This file maps backend endpoints to our implemented Use Cases
 * to identify any missing functionality.
 */

// === BACKEND ENDPOINTS (from /backend/src/lambdas and api-spec) ===

/**
 * ✅ COVERED ENDPOINTS
 */
const COVERED_ENDPOINTS = {
  // Character Management
  'get-character': 'LoadCharacterUseCase',
  'get-characters': 'LoadAllCharactersUseCase',
  'create-character': 'CreateCharacterUseCase',
  'clone-character': 'CloneCharacterUseCase',
  'delete-character': '(Not implemented - likely admin function)',
  
  // Character Updates
  'update-skill': 'IncreaseSkillUseCase',
  'update-attribute': 'UpdateAttributeUseCase', 
  'update-base-value': 'UpdateBaseValueUseCase',
  'update-combat-stats': 'UpdateCombatValueUseCase',
  'update-level': 'LevelUpUseCase',
  'update-calculation-points': 'UpdateCalculationPointsUseCase',
  
  // Special Abilities
  'add-special-ability': 'AddSpecialAbilityUseCase',
  
  // History Management
  'get-history': 'LoadHistoryUseCase',
  'revert-history-record': 'DeleteHistoryEntryUseCase',
};

/**
 * 🚨 MISSING ENDPOINTS - Need Use Cases
 */
const MISSING_ENDPOINTS = {
  // History Management
  'add-history-record': 'AddHistoryRecordUseCase - MISSING',
  'set-history-comment': 'UpdateHistoryCommentUseCase - MISSING',
  
  // Utility
  'get-skill-increase-cost': 'GetSkillIncreaseCostUseCase - MISSING',
  'create-tenant-id': 'CreateTenantUseCase - MISSING (admin function)',
};

/**
 * 📋 API-SPEC ENDPOINTS MAPPING
 */
const API_SPEC_COVERAGE = {
  // ✅ Covered
  'get-character.ts': 'LoadCharacterUseCase',
  'get-characters.ts': 'LoadAllCharactersUseCase', 
  'patch-skill.ts': 'IncreaseSkillUseCase',
  'patch-attribute.ts': 'UpdateAttributeUseCase',
  'patch-base-value.ts': 'UpdateBaseValueUseCase',
  'patch-combat-stats.ts': 'UpdateCombatValueUseCase',
  'post-level.ts': 'LevelUpUseCase',
  'get-history.ts': 'LoadHistoryUseCase',
  'delete-history-record.ts': 'DeleteHistoryEntryUseCase',
  'post-characters.ts': 'CreateCharacterUseCase',
  'post-character-clone.ts': 'CloneCharacterUseCase', 
  'post-special-abilities.ts': 'AddSpecialAbilityUseCase',
  'patch-calculation-points.ts': 'UpdateCalculationPointsUseCase',
  
  // 🚨 Missing
  'delete-character.ts': 'DeleteCharacterUseCase - MISSING',
  'patch-history-record.ts': 'UpdateHistoryCommentUseCase - MISSING',
  'get-skill.ts': 'GetSkillUseCase - MISSING (might be utility)',
};

/**
 * 🎯 PRIORITY MISSING USE CASES
 * 
 * Based on user workflow importance:
 */
const HIGH_PRIORITY_MISSING = [
  'GetSkillIncreaseCostUseCase',   // Cost calculation before increase
];

const MEDIUM_PRIORITY_MISSING = [
  'AddHistoryRecordUseCase',       // Manual history entries
  'UpdateHistoryCommentUseCase',   // History annotation
];

const LOW_PRIORITY_MISSING = [
  'DeleteCharacterUseCase',        // Admin/rare function
  'CreateTenantUseCase',           // Admin function
];

/**
 * ✅ RECENTLY COMPLETED USE CASES
 */
const RECENTLY_COMPLETED = [
  'CreateCharacterUseCase',        // ✅ Essential for new characters
  'CloneCharacterUseCase',         // ✅ Common user workflow
  'AddSpecialAbilityUseCase',      // ✅ Character progression
  'UpdateCalculationPointsUseCase', // ✅ Point management
];

/**
 * 📊 COVERAGE STATISTICS
 */
const COVERAGE_STATS = {
  totalEndpoints: 18,
  coveredEndpoints: 13, // Updated: added 4 new Use Cases
  missingEndpoints: 5,  // Updated: reduced by 4 
  coveragePercentage: (13/18 * 100).toFixed(1) + '%' // Now 72.2%
};

/**
 * 📈 IMPLEMENTATION PROGRESS
 */
const IMPLEMENTATION_PROGRESS = {
  previousCoverage: '50.0%',
  currentCoverage: '72.2%',
  improvement: '+22.2%',
  recentlyAdded: [
    'CreateCharacterUseCase',
    'CloneCharacterUseCase', 
    'AddSpecialAbilityUseCase',
    'UpdateCalculationPointsUseCase'
  ],
  nextPriority: 'GetSkillIncreaseCostUseCase'
};

export {
  COVERED_ENDPOINTS,
  MISSING_ENDPOINTS,
  HIGH_PRIORITY_MISSING,
  MEDIUM_PRIORITY_MISSING,
  LOW_PRIORITY_MISSING,
  RECENTLY_COMPLETED,
  COVERAGE_STATS,
  IMPLEMENTATION_PROGRESS
};