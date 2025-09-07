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
  const [apInput, setApInput] = useState(0);
  const [epInput, setEpInput] = useState(0);
  const idToken = useAuth().idToken;
  const [modifiedTile, setModifiedTile] = useState<{ key: string; value: number } | null>(null);

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

  const handleLvlUp = async () => {
    show();
    const currentLevel = characterSheet?.generalInformation.level ?? 0;
    await lvlUp(currentLevel);
    handleBenefitChange(null); // TODO implement benefit change
    hide();
  };

  const handleChange = (value: CharacterOptions | null) => {
    if (value) {
      selectValue(value.value);
      setSelectedCharacter(value.value);
    }
  };

  const handleBenefitChange = (option: LevelUpOption | null) => {
    return option;
  };

  const loadCharacter = async () => {
    if (idToken) {
      updateCharacter(idToken, selectedValue);
    }
  };

  const updateCharacterPoints = (type: "adventurePoints" | "attributePoints", amount: number) => {
    console.log(`Updating ${type} by ${amount}`);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-100 h-full overflow-y-auto">
      <div className="font-bold bg-black text-white p-4 rounded sticky top-0 z-10">
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
          <>
            <div className="border rounded-lg p-4 bg-white shadow flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Legendary Actions",
                    key: "legendaryActions",
                    value: characterSheet?.baseValues.legendaryActions.current ?? 0,
                  },
                  {
                    label: "Bonus Actions",
                    key: "bonusActionsPerCombatRound",
                    value: characterSheet?.baseValues.bonusActionsPerCombatRound.current ?? 0,
                  },
                  {
                    label: "Health Points",
                    key: "healthPoints",
                    value: characterSheet?.baseValues.healthPoints.current ?? 0,
                  },
                  {
                    label: "Initiative",
                    key: "initiativeBaseValue",
                    value: characterSheet?.baseValues.initiativeBaseValue.current ?? 0,
                  },
                  {
                    label: "Armor Level",
                    key: "armorLevel",
                    value: characterSheet?.baseValues.armorLevel.current ?? 0,
                  },
                  {
                    label: "Luck Points",
                    key: "luckPoints",
                    value: characterSheet?.baseValues.luckPoints.current ?? 0,
                  },
                ].map(({ label, key, value }) => {
                  const currentValue = modifiedTile?.key === key ? modifiedTile.value : value;
                  const locked = !!modifiedTile && modifiedTile.key !== key;

                  return (
                    <div
                      key={key}
                      className="border rounded-lg p-3 bg-gray-100 shadow flex flex-col items-center justify-center text-center"
                    >
                      <span className="font-semibold text-sm">{label}</span>
                      <span className="text-lg font-bold">
                        {modifiedTile?.key === key ? `${value} → ${modifiedTile.value}` : value}
                      </span>
                      <div className="flex gap-2 mt-2">
                        <Button
                          disabled={locked}
                          className="bg-black text-white text-xs"
                          size="sm"
                          onClick={() => setModifiedTile({ key, value: currentValue + 1 })}
                        >
                          +1
                        </Button>
                        <Button
                          disabled={locked}
                          className="bg-black text-white text-xs"
                          size="sm"
                          onClick={() => {
                            const newValue = currentValue - 1;
                            if (newValue === value) {
                              setModifiedTile(null);
                            } else {
                              setModifiedTile({ key, value: newValue });
                            }
                          }}
                        >
                          -1
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button className="bg-black text-white font-bold py-2 mt-4 w-full" onClick={handleLvlUp}>
                Level Up
              </Button>
            </div>

            <div className="pt-4 grid grid-rows-2 gap-4">
              <div className="border rounded-lg p-4 flex flex-col items-center bg-white shadow">
                <Button
                  className="bg-black text-white w-full mb-3"
                  onClick={() => {
                    if (apInput > 0) {
                      updateCharacterPoints("adventurePoints", apInput);
                      setApInput(0);
                    }
                  }}
                >
                  Increase AP
                </Button>
                <input
                  type="number"
                  min={0}
                  className="border rounded px-2 py-1 w-full text-center"
                  value={apInput}
                  onChange={(e) => setApInput(Number(e.target.value))}
                  placeholder="Enter AP"
                />
              </div>

              <div className="border rounded-lg p-4 flex flex-col items-center bg-white shadow">
                <Button
                  className="bg-black text-white w-full mb-3"
                  onClick={() => {
                    if (epInput > 0) {
                      updateCharacterPoints("attributePoints", epInput);
                      setEpInput(0);
                    }
                  }}
                >
                  Increase EP
                </Button>
                <input
                  type="number"
                  min={0}
                  className="border rounded px-2 py-1 w-full text-center"
                  value={epInput}
                  onChange={(e) => setEpInput(Number(e.target.value))}
                  placeholder="Enter EP"
                />
              </div>
            </div>
          </>
        )}
      </nav>
    </div>
  );
};

export default CharacterInfoContent;
