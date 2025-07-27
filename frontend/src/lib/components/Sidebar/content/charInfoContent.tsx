"use client";

import { useCharacterStore } from "@/src/app/global/characterStore";
import { useState } from "react";
import AsyncSelect from "react-select/async";
import { Button } from "../../ui/button";
import { useAuth } from "@/src/app/global/AuthContext";
import { useSkillUpdater } from "@/src/hooks/useSkillUpdate";
import { useLoadingOverlay } from "@/src/app/global/OverlayContext";

export type CharacterOptions = {
  value: string;
  label: string;
  userId: string;
  level: number;
};

export type LevelUpOption = {
  value: string;
  label: string;
};

const CharacterInfoContent: React.FC = () => {
  const [selectedValue, selectValue] = useState<string>("");

  const setSelectedCharacter = useCharacterStore((state) => state.setSelectedCharacter);
  const updateAvailableCharacters = useCharacterStore((state) => state.updateAvailableCharacters);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);
  const characters = useCharacterStore((state) => state.availableCharacters);
  const characterSheet = useCharacterStore((state) => state.characterSheet);
  const editMode = useCharacterStore((state) => state.editMode);
  const { lvlUp } = useSkillUpdater();
  const { show, hide } = useLoadingOverlay();

  const idToken = useAuth().idToken;

  const loadCharacterOptions = async (idToken: string) => {
    await updateAvailableCharacters(idToken);
    return characters.map((char) => ({
      value: char.characterId,
      label: char.name,
      userId: char.userId,
      level: char.level,
    }));
  };

  const promiseCharacterOptions = () =>
    new Promise<CharacterOptions[]>((resolve) => {
      setTimeout(async () => {
        if (idToken) {
          const options = await loadCharacterOptions(idToken);
          resolve(options);
        } else {
          resolve([]);
        }
      }, 0);
    });

  const loadLevelUpOptions = async (): Promise<LevelUpOption[]> => {
    if (!idToken || !selectedValue) return [];

    // TODO: Replace this with a real backend call
    return [
      { value: "hp", label: "Increase Health Points" },
      { value: "armorLvl", label: "Improve Armor Level" },
      { value: "ini", label: "Improve Initiative" },
      { value: "luck", label: "Add Luckpoint" },
      { value: "action", label: "Add Bonus Action" },
      { value: "legend", label: "Add Legendary Action" },
      { value: "reroll", label: "Add Reroll Action" },
    ];
  };

  const handleLvlUp = async () => {
    show();
    const currentLevel = characterSheet?.generalInformation.level ?? 0;
    await lvlUp(currentLevel);
    hide();
  };

  const promiseLevelUpOptions = () =>
    new Promise<LevelUpOption[]>((resolve) => {
      setTimeout(async () => {
        const options = await loadLevelUpOptions();
        resolve(options);
      }, 0);
    });

  const handleChange = (value: CharacterOptions | null) => {
    if (value) {
      selectValue(value.value);
      setSelectedCharacter(value.value);
    }
  };

  const handleBenefitChange = (option: LevelUpOption | null) => {
    if (option) {
      setSelectedBenefit(option.value);
      // Optionally update store or local state
    }
  };

  const loadCharacter = async () => {
    if (idToken) {
      updateCharacter(idToken, selectedValue);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-grey-500 h-full">
      <div className="font-bold bg-black text-white p-4 rounded sticky top-0">
        <h2>Current Character State</h2>
      </div>

      <nav className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <AsyncSelect
            defaultOptions={characters.map((char) => ({
              value: char.characterId,
              label: char.name,
              userId: char.userId,
              level: char.level,
            }))}
            cacheOptions
            onMenuOpen={promiseCharacterOptions}
            loadOptions={promiseCharacterOptions}
            onChange={handleChange}
            className="w-1/2"
          />
          <Button onClick={loadCharacter} className="w-1/2">
            Load Character
          </Button>
        </div>

        {editMode && (
          <div className="flex gap-2 items-center">
            <AsyncSelect
              cacheOptions
              defaultOptions
              loadOptions={promiseLevelUpOptions}
              onChange={handleBenefitChange}
              placeholder="Choose Level-Up Benefit"
              className="w-full"
            />
            <Button onClick={handleLvlUp} className="w-1/2">
              Level up
            </Button>
          </div>
        )}
        {characterSheet?.generalInformation?.name && (
          <div className="flex flex-col text-black bg-white p-4 rounded-lg">
            <div className="text-md font-semibold space-y-1">
              <div className="text-md font-semibold space-y-1 ml-auto">
                <div className="grid grid-cols-[150px_1fr] gap-2">
                  <span>
                    <strong>Name:</strong>
                  </span>
                  <span>{characterSheet.generalInformation.name}</span>

                  <span>
                    <strong>Level:</strong>
                  </span>
                  <span>{characterSheet.generalInformation.level}</span>

                  <span>
                    <strong>Owner:</strong>
                  </span>
                  <span>Philipp</span>

                  <span>
                    <strong>Editable:</strong>
                  </span>
                  <span>Yes</span>
                </div>
              </div>

              <div className="pt-4 grid gap-2">
                {[
                  { label: "Legendary Actions", value: characterSheet.baseValues.legendaryActions.current },
                  { label: "Bonus Actions", value: characterSheet.baseValues.bonusActionsPerCombatRound.current },
                  { label: "Health Points", value: characterSheet.baseValues.healthPoints.current },
                  { label: "Mental Health", value: characterSheet.baseValues.mentalHealth.current },
                  { label: "AP", value: characterSheet.calculationPoints.adventurePoints.available },
                  { label: "EP", value: characterSheet.calculationPoints.attributePoints.available },
                ].map(({ label, value }) => (
                  <div key={label} className="grid grid-cols-[150px_60px_repeat(4,40px)] items-center gap-2">
                    <span>{label}:</span>
                    <span className="text-right">{value}</span>
                    <Button className="bg-black text-white" size="sm">
                      +1
                    </Button>
                    <Button className="bg-black text-white" size="sm">
                      +10
                    </Button>
                    <Button className="bg-black text-white" size="sm">
                      -1
                    </Button>
                    <Button className="bg-black text-white" size="sm">
                      -10
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
};

export default CharacterInfoContent;
