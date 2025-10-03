import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpdateCombatValueUseCase } from '../lib/application/use-cases/UpdateCombatValueUseCase'
import { CharacterService } from '../lib/services/characterService'
import { 
  createSuccessResult,
  createErrorResult,
  TEST_SCENARIOS 
} from './test-utils'

// Mock the CharacterService
vi.mock('../lib/services/characterService')

describe('UpdateCombatValueUseCase', () => {
  let useCase: UpdateCombatValueUseCase
  let mockCharacterService: CharacterService
  
  beforeEach(() => {
    mockCharacterService = {
      getCharacter: vi.fn(),
      getAllCharacters: vi.fn(),
      updateSkill: vi.fn(),
      updateAttribute: vi.fn(),
      updateBaseValue: vi.fn(),
      updateCombatStats: vi.fn(),
      levelUp: vi.fn(),
      createCharacter: vi.fn(),
      cloneCharacter: vi.fn(),
      addSpecialAbility: vi.fn(),
      updateCalculationPoints: vi.fn(),
      deleteCharacter: vi.fn(),
      apiClient: {} as any
    } as any

    useCase = new UpdateCombatValueUseCase(mockCharacterService)
  })

  describe('Input Validation', () => {
    it('should reject empty character ID', async () => {
      const result = await useCase.execute({
        characterId: '',
        combatType: 'melee',
        combatValueName: 'swords',
        newAttackValue: 10,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Character ID is required')
      }
    })

    it('should reject empty combat value name', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: 'melee',
        combatValueName: '',
        newAttackValue: 10,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Combat value name is required')
      }
    })

    it('should reject empty ID token', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: 'melee',
        combatValueName: 'swords',
        newAttackValue: 10,
        idToken: ''
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Authentication token is required')
      }
    })

    it('should reject negative attack values', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: 'melee',
        combatValueName: 'swords',
        newAttackValue: -5,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('must be non-negative')
      }
    })

    it('should validate combat type', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: 'invalid' as any,
        combatValueName: 'swords',
        newAttackValue: 10,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Combat type must be melee or ranged')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Arrange
      vi.mocked(mockCharacterService.updateCombatStats).mockResolvedValue(
        createErrorResult('Combat update failed')
      )

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        combatType: 'melee' as const,
        combatValueName: 'swords',
        newAttackValue: 10,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Combat update failed')
      }
    })
  })
})