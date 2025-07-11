import { AllCharactersReply } from "../models/allCharacters/interface";
import { Character } from "../models/Character/character";
import { SkillIncreaseReply, SkillIncreaseRequest } from "../models/skills/interface";
import { HistoryReply } from "../models/history/interface";
import { AttributeIncreaseReply, AttributeIncreaseRequest } from "../models/attributes/interface";

enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PATCH = "PATCH",
  DELETE = "DELETE",
}

export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: string,
    public body: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function makeRequest<ReturnType>(idToken: string, endpoint_url: string, method: HttpMethod): Promise<ReturnType>;
async function makeRequest<ReturnType, BodyType>(
  idToken: string,
  endpoint_url: string,
  method: HttpMethod,
  body: BodyType,
): Promise<ReturnType>;

/**
 * Makes an api request
 * @param endpoint_url The url of the endpoint to call, excluding the api base url
 * @param method The http method to use
 * @param body The request body
 * @returns The reply of the api endpoint, see api documentation for more information
 */
async function makeRequest<ReturnType, BodyType>(
  idToken: string,
  endpoint_url: string,
  method: HttpMethod,
  body?: BodyType,
): Promise<ReturnType> {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/${endpoint_url}`;
  if (!idToken) {
    throw new Error(`[Api Error] Id token is empty, could not fetch: ${endpoint_url}`);
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${idToken}`,
  };

  const request: RequestInit = {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  };

  try {
    const response = await fetch(url, request);
    if (!response.ok) {
      const statusCode = response.statusText;
      const body = await response.json();

      throw new ApiError(`Failed to fetch: ${endpoint_url} - ${response.statusText}`, statusCode, body.message);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[Api Error]`, error);
    throw error;
  }
}

const get = <ReturnType>(idToken: string, endpoint_url: string): Promise<ReturnType> =>
  makeRequest<ReturnType>(idToken, endpoint_url, HttpMethod.GET);

const patch = <ReturnType, BodyType>(idToken: string, endpoint_url: string, body: BodyType): Promise<ReturnType> =>
  makeRequest<ReturnType, BodyType>(idToken, endpoint_url, HttpMethod.PATCH, body);

const remove = <ReturnType>(idToken: string, endpoint_url: string): Promise<ReturnType> =>
  makeRequest<ReturnType>(idToken, endpoint_url, HttpMethod.DELETE);

/**
 * Gets a character from the api
 * @param id The uuid of the character to get
 * @returns A promise of the Character object
 */
export async function getCharacter(idToken: string, id: string): Promise<Character> {
  const endpoint_url = `characters/${id}`;
  return await get<Character>(idToken, endpoint_url);
}

/**
 * Gets all characters owned or shared with the current user
 * @returns A string array holding all the character ids
 */
export async function getAllCharacters(idToken: string): Promise<AllCharactersReply> {
  const endpoint_url = `characters?character-short=true`;
  return await get<AllCharactersReply>(idToken, endpoint_url);
}

/**
 *
 * @param charId The uuid of the character
 * @param name The name of the skill
 * @param category The category of the skill
 * @returns A reply object reflecting the new state of the character
 */
export async function increaseSkill(
  idToken: string,
  charId: string,
  name: string,
  category: string,
  body: SkillIncreaseRequest,
): Promise<SkillIncreaseReply> {
  const endpoint_url = `characters/${charId}/skills/${category}/${name}`;
  return await patch<SkillIncreaseReply, SkillIncreaseRequest>(idToken, endpoint_url, body);
}

export async function increaseAttribute(
  idToken: string,
  charId: string,
  name: string,
  body: AttributeIncreaseRequest,
): Promise<AttributeIncreaseReply> {
  const endpoint_url = `characters/${charId}/attributes/${name}`;
  return await patch<AttributeIncreaseReply, AttributeIncreaseRequest>(idToken, endpoint_url, body);
}

/**
 * Gets the full history for a character
 * @param idToken The id token of the curren user
 * @param id The character id of the character
 * @returns The full history for the provided character id
 */
export async function getHistory(idToken: string, id: string): Promise<HistoryReply> {
  const endpoint_url = `characters/${id}/history`;
  return get<HistoryReply>(idToken, endpoint_url);
}

/**
 *
 * @param idToken The id token of the curren user
 * @param id The character id of the character
 * @param blockNumber The number of the block to fetch
 * @returns A History reply containing the requested block
 */
export async function getHistoryBlock(idToken: string, id: string, blockNumber: number): Promise<HistoryReply> {
  const endpoint_url = `characters/${id}/history?${blockNumber}`;
  return get<HistoryReply>(idToken, endpoint_url);
}

/**
 *
 * @param idToken The id token of the curren user
 * @param id The character id of the character
 * @param entryId The id of the skilling entry to delete
 * @returns
 */
export async function deleteHistoryEntry(idToken: string, id: string, entryId: string): Promise<HistoryReply> {
  const endpoint_url = `characters/${id}/history/${entryId}`;
  return remove<HistoryReply>(idToken, endpoint_url);
}

// export async function saveHistoryEntry(idToken: string, id: string, entryId: string): Promise<HistoryReply> {
//   const endpoint_url = `characters/${id}/history/${entryId}`;
//   return patch<HistoryReply>(idToken, endpoint_url);
// }
