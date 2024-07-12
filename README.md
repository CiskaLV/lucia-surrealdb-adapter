# lucia-surrealdb-adapter

Surreal DB adapter for Lucia.

## Installation

```bash
npm i lucia-surrealdb-adapter
```

## Setup

```ts
import { SurrealDBAdapter } from "lucia-surrealdb-adapter";
import Surreal from "surrealdb.js";

//You will have to set this up with the connect and sign in methods
const db = new Surreal();

const adapter = new SurrealDBAdapter(db, {
    user: "users",
    session: "sessions",
});
```
