import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpdateBaseValueUseCase } from '../lib/application/use-cases/UpdateBaseValueUseCase'
import { CharacterService } from '../lib/services/characterService'
import { 
  createSuccessResult,
  createErrorResult,
  TEST_SCENARIOS 
} from './test-utils'

// Mock the CharacterService
vi.mock('../lib/services/characterService')

describe('UpdateBaseValueUseCase', () => {
  let useCase: UpdateBaseValueUseCase
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

    useCase = new UpdateBaseValueUseCase(mockCharacterService)
  })

  describe('Input Validation', () => {
    it('should reject empty character ID', async () => {
      const result = await useCase.execute({
        characterId: '',
        baseValueName: 'healthPoints',
        newValue: 35,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Character ID is required')
      }
    })

    it('should reject empty base value name', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        baseValueName: '',
        newValue: 35,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Base value name is required')
      }
    })

    it('should reject empty ID token', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        baseValueName: 'healthPoints',
        newValue: 35,
        idToken: ''
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Authentication token is required')
      }
    })

    it('should reject negative values', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        baseValueName: 'healthPoints',
        newValue: -5,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('must be non-negative')
      }
    })
  })

  describe('Business Logic', () => {
    it('should successfully update base value when valid input provided', async () => {
      // Arrange
      const mockResponse = {
        data: {
          characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
          userId: TEST_SCENARIOS.VALID_USER_ID,
          baseValueName: 'healthPoints',
          changes: {
            old: { baseValue: { current: 30 } },
            new: { baseValue: { current: 35 } }
          }
        }
      }

      vi.mocked(mockCharacterService.updateBaseValue).mockResolvedValue(
        createSuccessResult(mockResponse)
      )

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        baseValueName: 'healthPoints',
        newValue: 35,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(true)
      expect(mockCharacterService.updateBaseValue).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        'healthPoints',
        35,
        TEST_SCENARIOS.VALID_ID_TOKEN
      )
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      vi.mocked(mockCharacterService.updateBaseValue).mockResolvedValue(
        createErrorResult('Update failed')
      )

      const input = {
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        baseValueName: 'healthPoints',
        newValue: 35,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Update failed')
      }
    })
  })
})