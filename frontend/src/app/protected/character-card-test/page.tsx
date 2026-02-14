"use client";

import { useCharacterStore } from "@/src/app/global/characterStore";
import { Heart, Brain, Package, Zap, Coins, Moon, Sparkles, Plus, Minus, Swords, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function CharacterCardTestPage() {
  const characterSheet = useCharacterStore((state) => state.characterSheet);
  const [goldAmount, setGoldAmount] = useState("");
  const [currencyAction, setCurrencyAction] = useState<"add" | "subtract">("add");
  const [selectedConsumable, setSelectedConsumable] = useState("");

  // Combat tracking state
  const [currentLuckPoints, setCurrentLuckPoints] = useState(3);
  const [currentActionsPerRound, setCurrentActionsPerRound] = useState(2);
  const [currentLegendaryActions, setCurrentLegendaryActions] = useState(1);
  const [currentRound, setCurrentRound] = useState(1);
  const [rolledInitiative, setRolledInitiative] = useState<number | null>(null);

  const rollInitiative = () => {
    const baseInitiative = characterSheet?.baseValues?.initiativeBaseValue?.current || 0;
    // Roll 1d20 and add base initiative
    const roll = Math.floor(Math.random() * 20) + 1;
    const total = roll + baseInitiative;
    setRolledInitiative(total);
  };

  if (!characterSheet) {
    return (
      <div className="container mx-auto py-5">
        <div className="text-center text-gray-500 py-10">
          <p className="text-xl">No character selected</p>
          <p className="text-sm mt-2">Please select a character from the sidebar to view the character card</p>
        </div>
      </div>
    );
  }

  const characterName = characterSheet.generalInformation?.name || "Unknown Hero";
  const characterLevel = characterSheet.generalInformation?.level || 1;
  const avatarUrl = "https://cdn.midjourney.com/6c9dddc8-38e1-4d6d-9ad0-d217e2ba377c/0_0.png";

  // Health and Mental Health values
  const healthCurrent = characterSheet.baseValues?.healthPoints?.current || 0;
  const healthByFormula = characterSheet.baseValues?.healthPoints?.byFormula || 0;
  const healthByLvlUp = characterSheet.baseValues?.healthPoints?.byLvlUp || 0;
  const healthMax = healthByFormula + healthByLvlUp;

  const mentalCurrent = characterSheet.baseValues?.mentalHealth?.current || 0;
  const mentalByFormula = characterSheet.baseValues?.mentalHealth?.byFormula || 0;
  const mentalByLvlUp = characterSheet.baseValues?.mentalHealth?.byLvlUp || 0;
  const mentalMax = mentalByFormula + (mentalByLvlUp || 0);

  // Calculate percentages for health bars
  const healthPercentage = healthMax > 0 ? (healthCurrent / healthMax) * 100 : 0;
  const mentalPercentage = mentalMax > 0 ? (mentalCurrent / mentalMax) * 100 : 0;

  return (
    <div className="container mx-auto py-5 bg-slate-100 min-h-screen">
      {/* Character Card Header Bar */}
      <div className="mx-[50px]">
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-b-2xl shadow-lg p-4">
          <div className="flex items-center gap-6">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full border-4 border-slate-600 overflow-hidden relative">
              <Image src={avatarUrl} alt={characterName} fill className="object-cover" priority />
            </div>

            {/* Name and Level */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{characterName}</h1>
              <p className="text-slate-300">Level {characterLevel}</p>
            </div>

            {/* Health Bars */}
            <div className="flex flex-col gap-3 min-w-[250px]">
              {/* Health Points */}
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-300 font-medium">Health</span>
                    <span className="text-xs text-slate-200 font-semibold">
                      {healthCurrent} / {healthMax}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300"
                      style={{ width: `${Math.min(healthPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Mental Health */}
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-blue-500 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-300 font-medium">Mental</span>
                    <span className="text-xs text-slate-200 font-semibold">
                      {mentalCurrent} / {mentalMax}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300"
                      style={{ width: `${Math.min(mentalPercentage, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="mx-[50px] mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-300 flex flex-col max-h-[600px]">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Inventory</h2>
          </div>
          <div className="space-y-2 mb-4 overflow-y-auto flex-1 pr-2">
            <p className="text-sm text-slate-500 italic">No inventory system implemented yet</p>
            {/* Placeholder inventory items */}
            <div className="border-l-4 border-blue-500 pl-3 py-2 bg-white">
              <p className="font-medium text-slate-700">Long Sword</p>
              <p className="text-xs text-slate-500">Damage: 1d8+4</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-3 py-2 bg-white">
              <p className="font-medium text-slate-700">Leather Armor</p>
              <p className="text-xs text-slate-500">Protection: +2</p>
            </div>
            <div className="border-l-4 border-red-500 pl-3 py-2 bg-white">
              <p className="font-medium text-slate-700">Health Potion x3</p>
              <p className="text-xs text-slate-500">Restores 20 HP</p>
            </div>
          </div>

          {/* Currency/Purse Section - Inside Inventory */}
          <div className="border-t border-slate-300 pt-4 mt-4">
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-blue-600" />
                  Gold
                </span>
                <span className="text-base font-bold text-slate-800">125</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-slate-400" />
                  Silver
                </span>
                <span className="text-base font-bold text-slate-700">45</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-blue-800" />
                  Copper
                </span>
                <span className="text-base font-bold text-slate-700">83</span>
              </div>
            </div>

            {/* Add/Subtract Controls */}
            <div className="border-t border-slate-300 pt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type="number"
                  value={goldAmount}
                  onChange={(e) => setGoldAmount(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  min="0"
                />
                <select
                  value={currencyAction}
                  onChange={(e) => setCurrencyAction(e.target.value as "add" | "subtract")}
                  className="px-2 py-1 text-xs border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="add">Add</option>
                  <option value="subtract">Subtract</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                  onClick={() => {
                    // Handle gold transaction
                    console.log(`${currencyAction} ${goldAmount} gold`);
                  }}
                >
                  {currencyAction === "add" ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  Gold
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1 bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                  onClick={() => {
                    // Handle silver transaction
                    console.log(`${currencyAction} ${goldAmount} silver`);
                  }}
                >
                  {currencyAction === "add" ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  Silver
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-1 bg-blue-800 hover:bg-blue-900 text-white text-xs font-medium py-1.5 px-2 rounded transition-colors"
                  onClick={() => {
                    // Handle copper transaction
                    console.log(`${currencyAction} ${goldAmount} copper`);
                  }}
                >
                  {currencyAction === "add" ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  Copper
                </button>
              </div>
            </div>
          </div>

          {/* Use Consumable Section */}
          <div className="border-t border-slate-300 pt-4 mt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Use Consumable</h3>
            <div className="space-y-2">
              <select
                value={selectedConsumable}
                onChange={(e) => setSelectedConsumable(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a consumable...</option>
                <option value="health-potion">Health Potion (x3) - Restore 20 HP</option>
                <option value="mana-potion">Mana Potion (x2) - Restore 15 Mental Health</option>
                <option value="strength-potion">Strength Potion (x1) - +2 STR for 10 rounds</option>
                <option value="antidote">Antidote (x1) - Cure poison</option>
              </select>
              <button
                disabled={!selectedConsumable}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded transition-colors"
                onClick={() => {
                  console.log(`Using consumable: ${selectedConsumable}`);
                  // Reset selection after use
                  setSelectedConsumable("");
                }}
              >
                Use Consumable
              </button>
            </div>
          </div>
        </div>

        {/* Base Values Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Swords className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800">Combat Stats</h2>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Round</div>
              <div className="text-xl font-bold text-slate-800">{currentRound}</div>
            </div>
          </div>

          {/* Grid of Combat Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Initiative */}
            <div className="border-2 border-slate-300 rounded-lg p-3 text-center bg-white">
              <div className="text-xs text-slate-600 uppercase mb-1">Initiative</div>
              <div className="text-2xl font-bold text-slate-800">
                {rolledInitiative !== null
                  ? rolledInitiative
                  : characterSheet.baseValues?.initiativeBaseValue?.current || 0}
              </div>
              {currentRound === 1 && rolledInitiative === null && (
                <button
                  className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded transition-colors"
                  onClick={rollInitiative}
                >
                  Roll Initiative
                </button>
              )}
            </div>

            {/* Luck Points */}
            <div className="border-2 border-slate-300 rounded-lg p-3 bg-white">
              <div className="text-xs text-slate-600 uppercase mb-1">Luck Points</div>
              <div className="text-center mb-2">
                <span className="text-2xl font-bold text-slate-800">{currentLuckPoints}</span>
                <span className="text-sm text-slate-500"> / {characterSheet.baseValues?.luckPoints?.current || 0}</span>
              </div>
              <button
                disabled={currentLuckPoints <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs py-1 rounded transition-colors"
                onClick={() => setCurrentLuckPoints((prev) => Math.max(0, prev - 1))}
              >
                Use
              </button>
            </div>

            {/* Actions */}
            <div className="border-2 border-slate-300 rounded-lg p-3 bg-white">
              <div className="text-xs text-slate-600 uppercase mb-1">Actions</div>
              <div className="text-center mb-2">
                <span className="text-2xl font-bold text-slate-800">{currentActionsPerRound}</span>
                <span className="text-sm text-slate-500">
                  {" "}
                  / {characterSheet.baseValues?.bonusActionsPerCombatRound?.current || 0}
                </span>
              </div>
              <button
                disabled={currentActionsPerRound <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs py-1 rounded transition-colors"
                onClick={() => setCurrentActionsPerRound((prev) => Math.max(0, prev - 1))}
              >
                Use
              </button>
            </div>

            {/* Legendary Actions */}
            <div className="border-2 border-slate-300 rounded-lg p-3 bg-white">
              <div className="text-xs text-slate-600 uppercase mb-1">Legendary</div>
              <div className="text-center mb-2">
                <span className="text-2xl font-bold text-slate-800">{currentLegendaryActions}</span>
                <span className="text-sm text-slate-500">
                  {" "}
                  / {characterSheet.baseValues?.legendaryActions?.current || 0}
                </span>
              </div>
              <button
                disabled={currentLegendaryActions <= 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs py-1 rounded transition-colors"
                onClick={() => setCurrentLegendaryActions((prev) => Math.max(0, prev - 1))}
              >
                Use
              </button>
            </div>
          </div>

          {/* Next Round Button */}
          <button
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            onClick={() => {
              // Reset to max values and increment round
              setCurrentActionsPerRound(characterSheet.baseValues?.bonusActionsPerCombatRound?.current || 0);
              setCurrentLegendaryActions(characterSheet.baseValues?.legendaryActions?.current || 0);
              setCurrentRound((prev) => prev + 1);
              console.log("Next round");
            }}
          >
            <RotateCcw className="w-4 h-4" />
            Next Round
          </button>
        </div>

        {/* Right Column - Smaller Cards Stacked */}
        <div className="flex flex-col gap-4">
          {/* Long Rest Card */}
          <div className="bg-white rounded-lg shadow-md p-4 flex-1 border border-slate-300">
            <div className="flex items-center gap-2 mb-3">
              <Moon className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Rest</h2>
            </div>
            <div className="space-y-2">
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors">
                Take Long Rest
              </button>
              <button className="w-full bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium py-1.5 px-3 rounded transition-colors">
                Take Short Rest
              </button>
              <p className="text-xs text-slate-500 text-center mt-1">Last rest: 2 hours ago</p>
            </div>
          </div>

          {/* Active Effects Card */}
          <div className="bg-white rounded-lg shadow-md p-4 flex-1 border border-slate-300">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-bold text-slate-800">Active Effects</h2>
            </div>
            <div className="space-y-2">
              {/* Placeholder active effects */}
              <div className="bg-red-50 border-l-4 border-red-500 p-1.5 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-slate-800">Strength Potion</p>
                    <p className="text-xs text-slate-600">+2 Strength</p>
                  </div>
                  <span className="text-xs font-bold text-red-600">8 rounds</span>
                </div>
              </div>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-1.5 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-slate-800">Shield Spell</p>
                    <p className="text-xs text-slate-600">+5 Armor</p>
                  </div>
                  <span className="text-xs font-bold text-blue-600">3 rounds</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic text-center mt-2">No active effects system yet</p>
            </div>
          </div>
        </div>
      </div>

      {/* Skills Section - Full Width Below */}
      <div className="mx-[50px] mt-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6 border border-slate-300">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-slate-800">Skills</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {characterSheet.skills &&
              Object.entries(characterSheet.skills).map(([category, skills]) => {
                if (typeof skills !== "object" || skills === null) return null;

                const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
                const activeSkills = Object.entries(skills as Record<string, unknown>).filter(
                  ([, skill]) => (skill as { activated?: boolean }).activated === true
                );

                if (activeSkills.length === 0) return null;

                return (
                  <div key={category} className="mb-3">
                    <h3 className="text-xs font-semibold text-blue-700 uppercase mb-2 pb-1 border-b-2 border-blue-300">
                      {categoryLabel}
                    </h3>
                    <div className="space-y-1">
                      {activeSkills.map(([skillName, skill]) => {
                        const skillLabel = skillName
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (str) => str.toUpperCase())
                          .trim();

                        return (
                          <div
                            key={skillName}
                            className="flex justify-between items-center py-1 px-2 hover:bg-blue-50 rounded"
                          >
                            <span className="text-sm text-slate-700">{skillLabel}</span>
                            <span className="text-sm font-bold text-blue-600">{skill.current}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
