import fetch from "node-fetch";
import { OAuth, getPreferenceValues } from "@raycast/api";
import { Context, Layer, Effect as E, Data} from "effect";
import { URLSearchParams } from "url";

const { accessKey, secretKey } = getPreferenceValues<UnsplashPreferences>();


export class AuthClient extends Context.Tag("Recipe")<
  AuthClient,
  { readonly client: OAuth.PKCEClient }
>() {}

export const AuthClientLive = Layer.sync(AuthClient,
  () => ({
    client: new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Unsplash",
    providerIcon: "unsplash-logo.png",
    description: "Login to your Unsplash account.",
  }),
  })
)

export const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Unsplash",
  providerIcon: "unsplash-logo.png",
  description: "Login to your Unsplash account.",
});

export class AuthError extends Data.TaggedError("AuthError")<{
  readonly error: 
    | {
      readonly _tag: "AuthRequestError";
      readonly error: unknown;
      }
    | {
      readonly _tag: "AuthAuthorizeError";
      readonly error: unknown;
      }
    | {
      readonly _tag: "AuthTokensError";
      readonly error: unknown;
    }
}>{}

export const doAuth2 = E.gen(function* () {
  const { client }= yield* AuthClient

  const authRequest = yield* E.tryPromise({
    try: () => client.authorizationRequest({
    endpoint: "https://unsplash.com/oauth/authorize",
    clientId: accessKey,
    scope: "public read_user write_likes",
    }),
    catch: (e) => new AuthError({ error: { _tag: "AuthRequestError", error: e } })
  })

  const { authorizationCode } = yield* E.tryPromise({
    try: () => client.authorize(authRequest),
    catch: (e) => new AuthError({ error: { _tag: "AuthAuthorizeError", error: e } })
  })

  // const params = HttpClient.urlParams.fromInput({
  //   "client_id": accessKey,
  //   "client_secret": secretKey,
  //   "redirect_uri": authRequest.redirectURI,
  //   "code": authorizationCode,
  //   "grant_type": "authorization_code"
  // })

  // const tokenResponse = yield* HttpClient.request.post("https://unsplash.com/oauth/token", {
  //     body: HttpClient.body.urlParams(params)
  //   }).pipe(
  //     HttpClient.client.fetch,
  //     HttpClient.response.json,
  //     E.catchAll((e) => E.fail(new AuthError({ error: { _tag: "AuthTokensError", error: e } })))
  //   )


  const params = new URLSearchParams();
  params.append("client_id", accessKey);
  params.append("client_secret", secretKey);
  params.append("redirect_uri", authRequest.redirectURI);
  params.append("code", authorizationCode);
  params.append("grant_type", "authorization_code");

  const tokenResponse = yield* E.tryPromise({
    try: () => fetch("https://unsplash.com/oauth/token", {
      method: "POST",
      body: params,
    }).then((res) => res.json()),
    catch: (e) => new AuthError({ error: { _tag: "AuthTokensError", error: e } })
  })

  yield* E.promise(() => client.setTokens(tokenResponse as OAuth.TokenResponse)).pipe(
    E.tap(() => console.log("tokens set") )
  )
})