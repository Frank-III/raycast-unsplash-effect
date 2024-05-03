import { LocalStorage, OAuth, getPreferenceValues } from "@raycast/api";
import fetch, { type RequestInit } from "node-fetch";
import { AuthClient, doAuth2 } from "@/oauth";
import { URLSearchParams } from "url";
import { AbortError as FetchAbortError } from "node-fetch";
import {Effect as E, Option as O, Data, Console} from "effect"
import * as HttpClient from "@effect/platform/HttpClient";

const { accessKey } = getPreferenceValues<UnsplashPreferences>();

export class AbortError extends Data.TaggedError("AbortError")<{
  e: unknown
}> {}


export class FetchError extends Data.TaggedError("FetchError")<{
  e: unknown
}> {}


export const apiRequest2 = <T>(path: string, options?: RequestInit) => E.gen(function* () {
  const { client } = yield* AuthClient

  const getToken = E.promise(() => client.getTokens())//.pipe(E.tap((tokens) => Console.log("get Tokens:",tokens)))

  const tokens = yield* getToken
  const getAccessToken = O.fromNullable(tokens?.accessToken).pipe(
    O.match({
      onNone: () => E.promise(LocalStorage.clear).pipe(
        E.zipRight(doAuth2),
        E.zipRight(getToken),
        E.map((tokens) => tokens?.accessToken)
      ),
      onSome: (accessToken) => E.if(tokens?.refreshToken !== undefined && tokens?.isExpired(), {
        onTrue: () => refreshToken2(tokens?.refreshToken || "").pipe(
          E.flatMap((refreshToken) => E.promise(() => client.setTokens({ accessToken, refreshToken }))),
          E.zipRight(getToken),
          E.map((tokens) => tokens?.accessToken)
        ),
        onFalse: () => E.succeed(accessToken)
      })
    }),
    // E.tap((token) => Console.log(token))
  )

  const accessToken = yield* getAccessToken

  const url = path.startsWith("https://api.unsplash.com/") ? path : `https://api.unsplash.com${path}`;

  const response = yield* E.tryPromise({
    try: () => fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...options?.headers,
      },
      }).then((res) => res.json() as T),
    catch: (e) => {
      if (e instanceof FetchAbortError) {
        return new AbortError({ e }) 
      }
      // console.log("fetcherror", e) 
      return new FetchError({e})
    }})

  return response
})

const refreshToken2 = (refreshToken: string) => E.gen(function* () {
  const params = HttpClient.urlParams.fromInput({
    "client_id": accessKey,
    "refresh_token": refreshToken,
    "grant_type": "refresh_token"
  })

  const response = (
    yield* HttpClient.request.post("https://unsplash.com/oauth/token", {
    body: HttpClient.body.urlParams(params)
    }).pipe(
      HttpClient.client.fetch,
      HttpClient.response.json
      // E.catchAll((e) => E.fail(new AuthError({ error: { _tag: "AuthTokensError", error: e } })))
    )
  ) as OAuth.TokenResponse 
  return response.refresh_token ?? refreshToken
})