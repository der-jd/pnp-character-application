import { AllCharactersReply } from "../models/allCharacters/interface";
import { Character } from "../models/Character/character";
import { SkillIncreaseReply, SkillIncreaseRequest } from "../models/skillIncrease/interface";

enum HttpMethod {
    GET = "GET",
    POST = "POST",
    PATCH = "PATCH"
}

async function makeRequest<ReturnType>(idToken: string, endpoint_url: string, method: HttpMethod): Promise<ReturnType>; 
async function makeRequest<ReturnType, BodyType>(idToken: string, endpoint_url: string, method: HttpMethod, body: BodyType): Promise<ReturnType>;

/**
 * Makes an api request
 * @param endpoint_url The url of the endpoint to call, excluding the api base url
 * @param method The http method to use
 * @param body The request body
 * @returns The reply of the api endpoint, see api documentation for more information
 */
async function makeRequest<ReturnType, BodyType>(idToken: string, endpoint_url: string, method: HttpMethod, body?: BodyType): Promise<ReturnType> {
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/${endpoint_url}`; 
  if(!idToken) {
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

  const response = await fetch(url, request);
  if(!response.ok) {
    throw new Error(`[Api Error] could not fetch: ${endpoint_url}`);
  }

  return response.json();
}

const get = <ReturnType>(idToken: string, endpoint_url: string): Promise<ReturnType> => makeRequest<ReturnType>(idToken, endpoint_url, HttpMethod.GET);
// const post = <T>(endpoint_url: string): Promise<T> => makeRequest<T, HttpMethod.POST>(endpoint_url, HttpMethod.POST);
const patch = <ReturnType, BodyType>(idToken: string, endpoint_url: string, body: BodyType): Promise<ReturnType> => makeRequest<ReturnType, BodyType>(idToken, endpoint_url, HttpMethod.PATCH, body);

/**
 * Gets a character from the api
 * @param id The uuid of the character to get
 * @returns A promise of the Character object
 */
export async function getCharacter(idToken: string, id: string): Promise<Character> {
  const endpoint_url = `characters/${id}`;
  return get<Character>(idToken, endpoint_url);
}

/**
 * Gets all characters owned or shared with the current user
 * @returns A string array holding all the character ids
 */
export async function getAllCharacters(idToken: string): Promise<AllCharactersReply> {
  const endpoint_url = `characters`;
  return get<AllCharactersReply>(idToken, endpoint_url);
}

/**
 * 
 * @param charId The uuid of the character
 * @param name The name of the skill
 * @param category The category of the skill
 * @returns A reply object reflecting the new state of the character
 */
export async function increaseSkill(idToken: string, charId: string, name: string, category: string, body: SkillIncreaseRequest): Promise<SkillIncreaseReply> {
  const endpoint_url = `character/${charId}/skills/${category}/${name}`
  return patch<SkillIncreaseReply, SkillIncreaseRequest>(idToken, endpoint_url, body);
}
