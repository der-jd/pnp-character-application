"use client";

import React from "react";
import { useState } from "react";
import { SingleValue } from "react-select";
import AsyncSelect from "react-select/async";
import { useCharacterStore } from "@/src/app/global/characterStore";
import { AllCharactersCharacter } from "@api/models/allCharacters/interface";
import { useAuth } from "@/src/app/global/AuthContext";
import { Button } from "../ui/button";

interface CharacterOptions {
  label: string;
  value: string;
}

const SidebarRight: React.FC = () => {
  const [selectedValue, selectValue] = useState<string>("");

  const handleChange = (value: SingleValue<CharacterOptions>) => {
    if (value) {
      selectValue(value.value);
    }
  };

  const updateAvailableCharacters = useCharacterStore((state) => state.updateAvailableCharacters);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);
  const characters: Array<AllCharactersCharacter> = useCharacterStore((state) => state.availableCharacters);
  const loadedCharacter = useCharacterStore((state) => state.characterSheet?.generalInformation.name);

  const idToken = useAuth().idToken;

  const loadOptions = async (idToken: string) => {

    await updateAvailableCharacters(idToken);

    return characters.map((char) => ({
      value: char.characterId,
      label: char.name,
      userId: char.userId,
      level: char.level,
    }));
  };

  const promiseOptions = () => {
    return new Promise<CharacterOptions[]>((resolve) => {
      setTimeout(async () => {
        if (idToken) {
          const options = await loadOptions(idToken);
          resolve(options);
        } else {
          resolve([]);
        }
      }, 0);
    });
  };

  const loadCharacter = async () => {
    if (idToken) {
      updateCharacter(idToken, selectedValue);
    }
  };

  return (
    <div className="flex-1 bg-grey-500">
      <div className="font-bold bg-black text-white p-6 sticky top-0 h-full">
        <h2>Fucking Awesome SideBar</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <a href="#home">Markus Rühl Facts</a>
          </li>
          <li>
            <a href="#about">Another car</a>
          </li>
          <li>
            <a href="#services">Add a scoop of protein</a>
          </li>
          <li>
            <a href="#contact">Contact</a>
          </li>
          <li className="flex items-center justify-center">
            <AsyncSelect
              defaultOptions={characters.map((char) => ({
                value: char.characterId,
                label: char.name,
                userId: char.userId,
                level: char.level,
              }))}
              cacheOptions
              onMenuOpen={promiseOptions}
              loadOptions={promiseOptions} // TODO update load options to filter for character names containing the input
              onChange={handleChange}
              className="m-2 w-1/2"
            />
            <Button onClick={loadCharacter} className="w-1/2">
              Load Character
            </Button>
          </li>
          <li className="flex items-center justify-center">
              <div className="items-center justify-center flex-1 m-2 bg-black rounded rounded-lg text-white">Current Character:</div>
              <div className="items-center justify-center flex-1 m-2 bg-black rounded rounded-lg text-white">{loadedCharacter != null ? loadedCharacter : ""}</div>
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default SidebarRight;
