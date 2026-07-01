const jwt = require("jsonwebtoken");

/**
 * Express Middleware: requireAuth
 * Intercepts requests to protected endpoints, reads and validates their JSON Web Token (JWT).
 * 
 * @param {Object} req  - Express request object
 * @param {Object} res  - Express response object
 * @param {Function} next - Callback function to move to the next handler in the pipeline
 */
function requireAuth(req, res, next) {
    try {
        // 1. GET HEADER: Check for incoming Authorization headers (handling case differences)
        const header = req.headers.authorization || req.headers.Authorization;

        if (!header || typeof header !== "string") {
            // Early exit if the header is completely missing. Returns HTTP 401 (Unauthorized)
            return res.status(401).json({ ok: false, message: "missing Authorization header" });
        }

        // 2. PARSE HEADER: Standard format is "Bearer <jwtToken>"
        // String.prototype.split divides the string at the space character.
        // Array destructuring captures the scheme and token variables.
        const [scheme, token] = header.split(" ");
        if (scheme !== "Bearer" || !token) {
            return res.status(401).json({ ok: false, message: "invalid Authorization header format" });
        }

        // 3. RETRIEVE ENVIRONMENT VARIABLE:
        // Ensure backend configuration has a loaded JWT_SECRET
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("Missing JWT_SECRET env var");
            return res.status(500).json({ ok: false, message: "server misconfigured" });
        }

        // 4. VERIFY TOKEN:
        // jwt.verify checks:
        //   a) if the token was signed with our JWT_SECRET
        //   b) if the token is within its expiration lifespan
        // If validation fails, it throws an error immediately, causing the catch block to run.
        const payload = jwt.verify(token, jwtSecret);

        // 5. ATTACH PAYLOAD STATE:
        // Attach the authenticated user's credentials to the request object (`req.user`).
        // Since `req` is shared down the routing chain, subsequent handlers can read `req.user.id`
        // without needing to query or decode the token again.
        req.user = {
            id: Number(payload.sub), // Convert standard string subject ID to database numeric type
            role: payload.role,
        };

        // 6. PASS CONTROL:
        // Calls the `next()` callback to hand over control to the route controller/handler.
        return next();
    } catch (err) {
        // 7. EXCEPTION HANDLER:
        // Any validation failure (expired token, wrong secret, modified signature) falls here.
        return res.status(401).json({ ok: false, message: "invalid or expired token" });
    }
}

module.exports = { requireAuth };