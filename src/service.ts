import {Effect as E, ManagedRuntime} from "effect"
import { AuthClientLive } from "./oauth"


export const runtime = ManagedRuntime.make(AuthClientLive)
