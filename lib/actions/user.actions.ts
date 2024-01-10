"use server";

import { revalidatePath } from "next/cache";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";

interface Params {
  userId: string;
  username: string;
  name: string;
  bio: string;
  image: string;
  path: string;
}

/**
 * The function `updateUser` updates a user's information in a database and revalidates a specific path
 * if necessary.
 * @param {string} userId - The unique identifier of the user.
 * @param {string} username - The username of the user to be updated. It should be a string.
 * @param {string} name - The name parameter is a string that represents the user's name.
 * @param {string} bio - The `bio` parameter is a string that represents the user's biography or
 * description. It can contain information about the user's background, interests, or any other
 * relevant details.
 * @param {string} image - The `image` parameter is a string that represents the URL or file path of
 * the user's profile image.
 * @param {string} path - The `path` parameter is a string that represents the path of the user's
 * profile. It is used to determine if the profile is being edited or created.
 */
export async function updateUser({
  userId,
  username,
  name,
  bio,
  image,
  path,
}: Params): Promise<void> {
  connectToDB();

  try {
    await User.findOneAndUpdate(
      { id: userId },
      { username: username.toLowerCase(), name, bio, image, path },
      { upsert: true }
    );

    if (path === "/profile/edit") {
      revalidatePath(path);
    }
  } catch (error: any) {
    throw new Error(`Failed to create/update user: ${error.message}`);
  }
}

/**
 * The function fetches a user from a database using their ID and returns a Promise that resolves to
 * the user object.
 * @param {string} userId - The `userId` parameter is a string that represents the unique identifier of
 * the user you want to fetch from the database.
 * @returns a Promise that resolves to the user object.
 */
export async function fetchUser(userId: string): Promise<any> {
  connectToDB();

  try {
    const user = await User.findOne({ id: userId });
    return user;
  } catch (error: any) {
    throw new Error(`Failed to fetch user: ${error.message}`);
  }
}
