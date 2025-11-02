"use client";

import React, { useState, useEffect, useRef } from "react";
import { useCharacterStore } from "@/src/app/global/characterStore";
import { useAuthState } from "@/src/app/global/AuthContext";
import { useDashboardViewModel } from "@/src/hooks/useDashboardViewModel";
import { Button } from "@/src/lib/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/src/hooks/use-toast";

export default function Dashboard() {
  const { toggleEdit, updateCharacter, setSelectedCharacter } = useCharacterStore();
  const isEditMode = useCharacterStore((state) => state.editMode);
  const { tokens } = useAuthState();
  const { toast } = useToast();
  const router = useRouter();

  // Use ViewModel hook
  const { ownCharacters, sharedCharacters, isLoading, error, loadCharacters, clearError } = useDashboardViewModel();

  const [shareOpenId, setShareOpenId] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const hasFetched = useRef(false);

  // Load characters on mount
  useEffect(() => {
    if (!hasFetched.current && tokens?.idToken) {
      hasFetched.current = true;
      loadCharacters(tokens.idToken);
    }
  }, [tokens?.idToken, loadCharacters]);

  // Handle errors with toast
  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error loading characters",
        description: error,
      });
      clearError();
    }
  }, [error, toast, clearError]);

  const handleShareToggle = (id: string) => {
    if (shareOpenId === id) {
      setShareOpenId(null);
      setShareEmail("");
    } else {
      setShareOpenId(id);
    }
  };

  const handleShareConfirm = (id: string) => {
    console.log(`Sharing character ${id} with ${shareEmail}`);
    setShareOpenId(null);
    setShareEmail("");
  };

  const handleEdit = (charId: string) => {
    if (!tokens?.idToken) {
      return; // TODO Show Error Toast
    }
    updateCharacter(tokens.idToken, charId);
    setSelectedCharacter(charId);

    if (!isEditMode) {
      toggleEdit();
    }

    router.push("/protected/talente");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header + main actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Your Characters</h1>
        <div className="flex gap-3">
          <Button className="bg-black text-white">Create Character</Button>
          <Button className="border border-black hover:bg-gray-100">Import Character</Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && <div className="text-center text-gray-500">Loading characters...</div>}

      {/* Character tiles - Own Characters */}
      {!isLoading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {ownCharacters.length === 0 ? (
              <div className="col-span-full text-sm text-gray-500">No characters yet.</div>
            ) : (
              ownCharacters.map((char) => {
                const isExpanded = shareOpenId === char.characterId;
                return (
                  <div
                    key={char.characterId}
                    className={`border rounded-lg p-4 bg-white shadow flex flex-col justify-between transition-all duration-300 ${
                      isExpanded ? "col-span-full lg:col-span-2" : ""
                    }`}
                  >
                    <div>
                      <div className="font-semibold truncate">{char.name}</div>
                      <div className="text-sm text-gray-500 mt-1">Level {char.level}</div>
                      <div className="text-sm text-gray-400 mt-1">Owner: You</div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <Button
                        className="border border-black hover:bg-gray-100"
                        onClick={() => handleEdit(char.characterId)}
                      >
                        Edit Character
                      </Button>
                      <Button
                        onClick={() => handleShareToggle(char.characterId)}
                        className="border border-black hover:bg-gray-100"
                      >
                        Share Character
                      </Button>

                      {isExpanded && (
                        <div className="flex flex-col sm:flex-row gap-2 mt-2">
                          <input
                            type="email"
                            placeholder="Enter email"
                            value={shareEmail}
                            onChange={(e) => setShareEmail(e.target.value)}
                            className="border px-2 py-1 rounded-md flex-1"
                          />
                          <Button className="bg-black text-white" onClick={() => handleShareConfirm(char.characterId)}>
                            Confirm
                          </Button>
                          <Button
                            className="border border-gray-300"
                            onClick={() => handleShareToggle(char.characterId)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}

                      <Button className="bg-red-600 text-white hover:bg-red-700">Delete Character</Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Shared Characters Section */}
          <h1 className="text-2xl font-bold mt-10 mb-6">Shared with you</h1>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sharedCharacters.length === 0 ? (
              <div className="col-span-full text-sm text-gray-500">No shared characters.</div>
            ) : (
              sharedCharacters.map((char) => {
                const isExpanded = shareOpenId === char.characterId;
                return (
                  <div
                    key={char.characterId}
                    className={`border rounded-lg p-4 bg-white shadow flex flex-col justify-between transition-all duration-300 ${
                      isExpanded ? "col-span-full lg:col-span-2" : ""
                    }`}
                  >
                    <div>
                      <div className="font-semibold truncate">{char.name}</div>
                      <div className="text-sm text-gray-500 mt-1">Level {char.level}</div>
                      <div className="text-sm text-gray-400 mt-1">Owner: {char.owner || "Unknown"}</div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2">
                      <Button
                        className="border border-black hover:bg-gray-100"
                        onClick={() => handleEdit(char.characterId)}
                      >
                        View Character
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
