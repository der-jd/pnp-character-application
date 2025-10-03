import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CloneCharacterUseCase } from '../lib/application/use-cases/CloneCharacterUseCase'
import { CharacterService } from '../lib/services/characterService'
import { 
  createSuccessResult,
  createErrorResult,
  TEST_SCENARIOS 
} from './test-utils'

// Mock the CharacterService
vi.mock('../lib/services/characterService')

describe('CloneCharacterUseCase', () => {
  let useCase: CloneCharacterUseCase
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

    useCase = new CloneCharacterUseCase(mockCharacterService)
  })

  describe('Input Validation', () => {
    it('should reject empty source character ID', async () => {
      const result = await useCase.execute({
        sourceCharacterId: '',
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Source character ID is required')
      }
    })

    it('should reject empty ID token', async () => {
      const result = await useCase.execute({
        sourceCharacterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: ''
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Authentication token is required')
      }
    })
  })

  describe('Business Logic', () => {
    it('should successfully clone character when valid input provided', async () => {
      // Arrange
      const mockClonedCharacter = {
        userId: TEST_SCENARIOS.VALID_USER_ID,
        characterId: 'new-character-id',
        name: 'Test Character (Clone)',
        level: 1
      }

      vi.mocked(mockCharacterService.cloneCharacter).mockResolvedValue(
        createSuccessResult(mockClonedCharacter)
      )

      const input = {
        sourceCharacterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(true)
      expect(mockCharacterService.cloneCharacter).toHaveBeenCalledWith(
        TEST_SCENARIOS.VALID_CHARACTER_ID,
        TEST_SCENARIOS.VALID_ID_TOKEN
      )
    })

    it('should handle service errors gracefully', async () => {
      // Arrange
      vi.mocked(mockCharacterService.cloneCharacter).mockResolvedValue(
        createErrorResult('Character not found')
      )

      const input = {
        sourceCharacterId: TEST_SCENARIOS.VALID_CHARACTER_ID,
        idToken: TEST_SCENARIOS.VALID_ID_TOKEN
      }

      // Act
      const result = await useCase.execute(input)

      // Assert
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toContain('Character not found')
      }
    })
  })
})