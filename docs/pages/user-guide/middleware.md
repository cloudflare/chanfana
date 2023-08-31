Currently middleware support is still limited to what [itty-router](https://github.com/kwhitley/itty-router) has to 
offer read more about it [here](https://itty.dev/itty-router/middleware).

Due to this, you cannot access the validated `data` parameter in your middlewares. However there are plans to offer this
in the future.

In short, an itty-router middleware is a function that doesn't return anything. With this in mind, everything can be
a middleware and every change you make in the `request`, `env` and `context` will be passed to endpoint downstream.

Here is a simple authentication middleware as an example of what you can do currently:

```ts
export function getBearer(request: Request): null | string {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || authHeader.substring(0, 6) !== 'Bearer') {
        return null
    }
    return authHeader.substring(6).trim()
}


export async function authenticateUser(request: Request, env: any, context: any) {
    const token = getBearer(request)
    let session

    if (token) {
        // Implement your own token validation here
        session = validateToken(token)
    }

    if (!token || !session) {
        return Response.json({
            success: false,
            errors: "Authentication error"
        }, {
            status: 401,
        })
    }

    // set the user_id for endpoint routes to be able to reference it
    env.user_id = session.user_id
}
```

When registering the middleware you have to take into consideration that only endpoint registered after the middleware
will be affected by it, here is an example on how you would register the authentication middleware above

```ts hl_lines="9"
export const router = OpenAPIRouter()

// 1. Endpoints that don't require Auth
router.post('/api/auth/register', AuthRegister);
router.post('/api/auth/login', AuthLogin);


// 2. Authentication middleware
router.all('/api/*', authenticateUser)


// 3. Endpoints that require Auth
router.get("/api/search", GetSearch);
```
