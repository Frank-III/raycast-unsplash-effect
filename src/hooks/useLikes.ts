import { showToast, Toast, LocalStorage } from "@raycast/api";
import { apiRequest2 } from "@/functions/apiRequest";
import { useState } from "react";
import {Effect as E, Option as O} from "effect"
import { runtime } from "../service"

export const useLikes2 = () => {
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState<LikesResult[]>([]);

  // TODO: should make a custom runtime 
  getUserLike2.pipe(
    E.tap((data) => E.sync(() => {
      setLikes(data)
      setLoading(false)
    })),
    E.catchAll((err) => E.sync(() => {
      showToast(Toast.Style.Failure, "Something went wrong.", String(err));
      setLoading(false);
    })),
    runtime.runPromise
    // E.runSync
  )

  return {
    loading, 
    likes
  }

}

export const getUserLike2 = E.gen(function* () {
  //FIXME: fix the return here --> fixed in a ulgy way
  const username = yield* E.promise(() => LocalStorage.getItem<string>("username")).pipe(
    E.map(O.fromNullable),
    E.flatMap(
      O.match({
        onSome: (username) => E.succeed(username),
        onNone: () => apiRequest2<User>("/me").pipe(
          E.tap((user) => E.promise(() => LocalStorage.setItem("username", user.username))),
          E.map((user) => user.username),)
      })
    ))
  // TODO: possible to do this?
  // E.map(O.getOrElse(() => apiRequest2<User>("/me").pipe(
  //   E.tap((user) => E.promise(() => LocalStorage.setItem("username", user.username))),
  //   E.map((user) => user.username),
  // ))),
  return yield* apiRequest2<LikesResult[]>(`/users/${username}/likes`)
})

export default useLikes2;
