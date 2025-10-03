import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UpdateAttributeUseCase } from '../lib/application/use-cases/UpdateAttributeUseCase'
import { 
  createSuccessResult,
  createErrorResult,
  TEST_SCENARIOS 
} from './test-utils'

describe('UpdateAttributeUseCase', () => {
  let mockCharacterService: any
  let useCase: UpdateAttributeUseCase

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
    }

    useCase = new UpdateAttributeUseCase(mockCharacterService)
  })

  describe('Input Validation', () => {
    it('should reject empty character ID', async () => {
      const result = await useCase.execute({
        characterId: '',
        attributeName: 'strength',
        newValue: 12,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Character ID is required')
      }
    })

    it('should reject empty attribute name', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: '',
        newValue: 12,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Attribute name is required')
      }
    })

    it('should reject invalid attribute values', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: 'strength',
        newValue: -1,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Attribute value must be positive')
      }
    })

    it('should reject empty ID token', async () => {
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: 'strength',
        newValue: 12,
        idToken: ''
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Authentication token is required')
      }
    })
  })

  describe('Business Logic', () => {
    it('should successfully update attribute when valid input provided', async () => {
      // Arrange
      const mockCharacter = {
        userId: 'test-user',
        characterId: 'test-char',
        characterSheet: {
          generalInformation: { name: 'Test Character', level: 1 },
          attributes: { strength: { current: 10 } }
        }
      } as any

      mockCharacterService.getCharacter.mockResolvedValue(
        createSuccessResult(mockCharacter)
      )
      mockCharacterService.updateAttribute.mockResolvedValue(
        createSuccessResult({ success: true })
      )

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: 'strength',
        newValue: 12,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockCharacterService.updateAttribute).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        'strength',
        { targetValue: 12 },
        TEST_SCENARIOS.VALID_ID_TOKEN
      )
    })

    it('should handle character loading failure', async () => {
      // Arrange
      mockCharacterService.getCharacter.mockResolvedValue(
        createErrorResult('Character not found')
      )

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.INVALID_CHARACTER_ID,
        attributeName: 'strength',
        newValue: 12,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Failed to load character')
      }
    })

    it('should handle attribute update failure', async () => {
      // Arrange
      const mockCharacter = { characterId: 'test' } as any
      mockCharacterService.getCharacter.mockResolvedValue(
        createSuccessResult(mockCharacter)
      )
      mockCharacterService.updateAttribute.mockResolvedValue(
        createErrorResult('Insufficient attribute points')
      )

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: 'strength',
        newValue: 18,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Failed to update attribute')
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      mockCharacterService.getCharacter.mockRejectedValue(
        new Error('Network timeout')
      )

      // Act
      const result = await useCase.execute({
        characterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        attributeName: 'strength',
        newValue: 12,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Network timeout')
      }
    })
  })
})