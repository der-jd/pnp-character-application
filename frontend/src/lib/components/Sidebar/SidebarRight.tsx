'use client'

import React from 'react';
import { useState } from "react";
import { SingleValue } from "react-select";
import AsyncSelect from "react-select/async";
import { useCharacterStore } from '@/src/app/global/characterStore';
import { AllCharactersCharacter } from '../../api/models/allCharacters/interface';
import { useAuth } from '@/src/app/global/AuthContext';
import { Button } from '../ui/button';

interface CharacterOptions {
  label: string,
  value: string,
}

const exampleData = [
  {charId: "asdfga", userId: "test", name: "testChar", level: 42},
  {charId: "sdf", userId: "test1", name: "testChar1", level: 42},
  {charId: "ssss", userId: "test2", name: "testChar2", level: 42},
  {charId: "asddddfga", userId: "test3", name: "testChar3", level: 42},
  {charId: "asdffffga", userId: "test4", name: "testChar4", level: 42},
]

const SidebarRight: React.FC = () => {
  const [selectedValue, selectValue] = useState<string>("");

  const handleChange = (value: SingleValue<CharacterOptions>) => {
    if(value) {
      selectValue(value.value);
      console.log(`Selected value ${value.value}`);
    }
  };

  const updateAvailableCharacters = useCharacterStore((state) => state.updateAvailableCharacters);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);

  const characters = useCharacterStore((state) => state.availableCharacters);
  const idToken = useAuth().idToken;

  const loadOptions = async (idToken: string) => {
    const characters: Array<AllCharactersCharacter> = useCharacterStore.getState().availableCharacters;

    if(!characters) {
      await updateAvailableCharacters(idToken);
    }

    return (characters.length > 0 ? characters : exampleData).map((char) => ({
      value: char.charId,
      label: char.name,
    }));
  };

  const promiseOptions = () => {
    return new Promise<CharacterOptions[]>((resolve) => {
      setTimeout(async () => {
        if(idToken) {
          const options = await loadOptions(idToken);
          resolve(options); 
        } else {
          console.log("no id token provided");
          resolve([]);
        }
      }, 0);
    });
  };

  const loadCharacter = async () => {
    if(idToken) {
      await updateCharacter(idToken, selectedValue);
    }
  }

  return (
    <div className="flex-1 bg-grey-500">
      <div className="font-bold bg-black text-white p-6 sticky top-0 h-full">
        <h2>Fucking Awesome SideBar</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li><a href="#home">Home</a></li>
          <li><a href="#about">About</a></li>
          <li><a href="#services">Services</a></li>
          <li><a href="#contact">Contact</a></li>
          <li className="flex items-center justify-center"><AsyncSelect
            cacheOptions={true}
            onMenuOpen={promiseOptions}
            loadOptions={promiseOptions}
            onChange={handleChange}
            className="m-2 w-1/2" />
            <Button onClick={loadCharacter} className="w-1/2">Load Character</Button></li>
        </ul>
      </nav>
    </div>
  );
};

export default SidebarRight;
