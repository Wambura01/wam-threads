"use server";

import { revalidatePath } from "next/cache";
import Thread from "../models/thread.model";
import User from "../models/user.model";
import { connectToDB } from "../mongoose";

interface Params {
  text: string;
  author: string;
  communityId: string | null;
  path: string;
}

/**
 * The function fetches top-level threads from a database, including their authors and child threads,
 * and returns the fetched threads along with a flag indicating if there are more threads to fetch.
 * @param [pageNumber=1] - The page number of the threads to fetch. It determines which page of threads
 * to retrieve from the database. The default value is 1.
 * @param [pageSize=20] - The `pageSize` parameter determines the number of threads to be fetched per
 * page. It specifies how many threads should be included in each page of results.
 * @returns The function `fetchThreads` returns an object with two properties: `threads` and `isNext`.
 * The `threads` property contains an array of thread objects, and the `isNext` property is a boolean
 * value indicating whether there are more threads available to fetch.
 */
export async function fetchThreads(pageNumber = 1, pageSize = 20) {
  connectToDB();

  const skipAmount = (pageNumber - 1) * pageSize;

  // fetch threads that have no parents (top level threads...)
  const threadsQuery = Thread.find({ parentId: { $in: [null, undefined] } })
    .sort({ createdAt: "desc" })
    .skip(skipAmount)
    .limit(pageSize)
    .populate({ path: "author", model: User })
    .populate({
      path: "children",
      populate: {
        path: "author",
        model: User,
        select: "_id name parentId image",
      },
    });

  /* The line `const totalThreadsCount = await Thread.countDocuments({ parentId: { : [null,
  undefined] } });` is counting the total number of threads in the database that have no parent
  (i.e., top-level threads). */
  const totalThreadsCount = await Thread.countDocuments({
    parentId: { $in: [null, undefined] },
  });

  try {
    const threads = await threadsQuery.exec();
    const isNext = totalThreadsCount > skipAmount + threads.length;

    return { threads, isNext };
  } catch (error: any) {
    throw new Error(`Failed to fetch threads: ${error.message}`);
  }
}

/**
 * The function creates a new thread, updates the user model, and revalidates the path.
 * @param {Params}  - - `text`: The text content of the thread.
 */
export async function createThread({
  text,
  author,
  communityId,
  path,
}: Params) {
  connectToDB();

  try {
    const createdThread = await Thread.create({
      text,
      author,
      community: null,
    });

    // update user model
    await User.findByIdAndUpdate(author, {
      $push: { threads: createdThread._id },
    });

    revalidatePath(path);
  } catch (error: any) {
    throw new Error(`Failed to create thread: ${error.message}`);
  }
}

/**
 * The function fetches a thread by its ID from a database, populates its author and children fields
 * with additional information, and returns the thread.
 * @param {string} id - The `id` parameter is a string that represents the unique identifier of the
 * thread you want to fetch from the database.
 * @returns The function `fetchThreadById` returns a `Thread` object.
 */
export async function fetchThreadById(id: string) {
  connectToDB();

  try {
    // TODO: populate community
    const thread = await Thread.findById(id)
      .populate({
        path: "author",
        model: User,
        select: "_id, id name image",
      })
      .populate({
        path: "children",
        populate: [
          {
            path: "author",
            model: User,
            select: "_id, id name parentId image",
          },
          {
            path: "children",
            model: Thread,
            populate: {
              path: "author",
              model: User,
              select: "_id, id name parentId image",
            },
          },
        ],
      })
      .exec();

    return thread;
  } catch (error: any) {
    throw new Error(`Failed to fetch thread by ID: ${error.message}`);
  }
}
