import { runContract } from "./auth-contract";
import { InMemoryAuthProvider } from "./fake";

runContract("InMemoryAuthProvider", () => new InMemoryAuthProvider());
